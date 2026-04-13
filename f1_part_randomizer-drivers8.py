import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk
import sqlite3
import pandas as pd
import shutil
import os
import random

# Function to select a database file
def select_db_file():
    global db_file_path
    db_file_path = filedialog.askopenfilename(filetypes=[("SQLite Database files", "*.db")])
    if db_file_path:
        if backup_var.get():
            backup_db_file(db_file_path)
        enable_buttons()

# Function to create a backup of the database file
def backup_db_file(db_file_path):
    backup_file_path = db_file_path.replace(".db", "-bk.db")
    if os.path.exists(backup_file_path):
        if not messagebox.askyesno("Overwrite Confirmation", f"The file {backup_file_path} already exists. Do you want to overwrite it?"):
            return
    shutil.copy(db_file_path, backup_file_path)
    messagebox.showinfo("Backup Created", f"Backup created at: {backup_file_path}")

# Function to enable option buttons after selecting the database
def enable_buttons():
    btn_all.config(state=tk.NORMAL)
    btn_ai.config(state=tk.NORMAL)
    btn_player.config(state=tk.NORMAL)
    btn_report.config(state=tk.NORMAL)
    update_drivers_button.config(state=tk.NORMAL)# Enable the report button

    
# Function to ensure the Parts_Designs_diff table exists and is properly structured
def ensure_diff_table_exists(cursor):
    # Ensure the Parts_Designs_diff table exists with the required columns
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Parts_Designs_diff (
            DesignID INTEGER PRIMARY KEY,
            PartType INTEGER,
            PartStat INTEGER,
            Difference REAL,
            PreviousDesignID INTEGER,
            TeamID INTEGER,
            RandomPercent REAL,
            IsNegativeDifference INTEGER DEFAULT 0
        )
    """)

    # Check if the Parts_Designs_diff table has all required columns, and add them if missing
    cursor.execute("PRAGMA table_info(Parts_Designs_diff)")
    columns = [info[1] for info in cursor.fetchall()]

    # Add missing columns if they do not exist
    if 'PreviousDesignID' not in columns:
        cursor.execute("ALTER TABLE Parts_Designs_diff ADD COLUMN PreviousDesignID INTEGER")
    if 'TeamID' not in columns:
        cursor.execute("ALTER TABLE Parts_Designs_diff ADD COLUMN TeamID INTEGER")
    if 'RandomPercent' not in columns:
        cursor.execute("ALTER TABLE Parts_Designs_diff ADD COLUMN RandomPercent REAL")
    if 'PartType' not in columns:
        cursor.execute("ALTER TABLE Parts_Designs_diff ADD COLUMN PartType INTEGER")
    if 'IsNegativeDifference' not in columns:
        cursor.execute("ALTER TABLE Parts_Designs_diff ADD COLUMN IsNegativeDifference INTEGER DEFAULT 0")



# Function to calculate differences and store them in the Parts_Designs_diff table
def calculate_differences_and_store():
    try:
        conn = sqlite3.connect(db_file_path)
        cursor = conn.cursor()

        # Ensure the Parts_Designs_diff table exists and has the PartType column
        ensure_diff_table_exists(cursor)

        # Get the current season from the Player_State table
        cursor.execute("SELECT CurrentSeason FROM Player_State")
        current_season = cursor.fetchone()[0]

        # Get all design IDs to calculate differences, excluding parts for the next season
        cursor.execute("""
            SELECT DesignID, PartType, TeamID FROM Parts_Designs
            WHERE ValidFrom <= ?
        """, (current_season,))
        designs_to_calculate = cursor.fetchall()

        differences = []

        for design_id, part_type, team_id in designs_to_calculate:
            # Check if the DesignID already exists in Parts_Designs_diff
            cursor.execute("""
                SELECT 1 FROM Parts_Designs_diff WHERE DesignID = ? AND PartStat = ?
            """, (design_id, part_type))
            
            if cursor.fetchone():
                # Update the PartType if the DesignID already exists
                cursor.execute("""
                    UPDATE Parts_Designs_diff SET PartType = ? WHERE DesignID = ?
                """, (part_type, design_id))
                continue  # Skip the rest of the loop if the DesignID exists

            # Find the previous version of the same part for the same team with the correct season constraint
            cursor.execute("""
                SELECT DesignID FROM Parts_Designs
                WHERE PartType=? AND TeamID=? AND DesignID < ? AND ValidFrom <= ?
                ORDER BY DesignID DESC LIMIT 1
            """, (part_type, team_id, design_id, current_season))
            previous_design = cursor.fetchone()

            if previous_design:
                previous_design_id = previous_design[0]

                # Get the PartStats and values for the current and previous designs
                cursor.execute("""
                    SELECT PartStat, Value FROM Parts_Designs_StatValues
                    WHERE DesignID=? 
                """, (previous_design_id,))
                previous_values = {row[0]: row[1] for row in cursor.fetchall()}

                cursor.execute("""
                    SELECT PartStat, Value FROM Parts_Designs_StatValues
                    WHERE DesignID=? 
                """, (design_id,))
                current_values = {row[0]: row[1] for row in cursor.fetchall()}

                for stat, current_value in current_values.items():
                    if stat == 15:
                        continue  # Skip processing if PartStat is 15

                    previous_value = previous_values.get(stat, None)
                    if previous_value is not None:
                        diff = current_value - previous_value
                        # Use existing difference from Parts_Designs_diff table
                        cursor.execute("""
                            SELECT Difference FROM Parts_Designs_diff
                            WHERE DesignID=? AND PartStat=?
                        """, (design_id, stat))
                        existing_diff = cursor.fetchone()

                        if existing_diff:
                            original_difference = existing_diff[0]
                        else:
                            original_difference = diff

                        # Log the difference along with PreviousDesignID, TeamID, PartType, and RandomPercent
                        random_percent = 0  # Set default to 0, modified later if necessary
                        differences.append((design_id, part_type, stat, original_difference, previous_design_id, team_id, random_percent))

        # Insert the differences into the Parts_Designs_diff table
        cursor.executemany("""
            INSERT OR IGNORE INTO Parts_Designs_diff (DesignID, PartType, PartStat, Difference, PreviousDesignID, TeamID, RandomPercent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, differences)

        conn.commit()
        conn.close()

    except Exception as e:
        messagebox.showerror("Error", str(e))



# Function to sort the treeview column when a column header is clicked
def sort_treeview_column(tv, col, reverse):
    # Get the list of all items in the treeview and their respective values
    l = [(tv.set(k, col), k) for k in tv.get_children('')]

    # Sort by the first element (which is the value in the column) ignoring case
    l.sort(reverse=reverse, key=lambda x: x[0].lower() if isinstance(x[0], str) else x[0])

    # Reorder the items in the treeview based on the sorted order
    for index, (val, k) in enumerate(l):
        tv.move(k, '', index)

    # Reverse sort next time
    tv.heading(col, command=lambda: sort_treeview_column(tv, col, not reverse))



import datetime

def convert_day_to_date(day_count):
    """Convert the day count to a date in 'yyyy-mm-dd' format or return 'IN DEVELOPMENT' if day_count is -1."""
    if day_count == -1:
        return "IN DEVELOPMENT"
    start_date = datetime.date(2024, 2, 18)  # Base date for day 45340
    delta = datetime.timedelta(days=day_count - 45340)
    return (start_date + delta).strftime('%Y-%m-%d')

def create_report():
    def filter_treeview():
        """Hide or show parts in development based on the checkbox."""
        for item in tree_default.get_children():
            values = tree_default.item(item, "values")
            if hide_var.get() and values[4] == "IN DEVELOPMENT":
                tree_default.detach(item)  # Hide the item
            else:
                tree_default.reattach(item, '', 'end')  # Show the item

    try:
        conn = sqlite3.connect(db_file_path)
        cursor = conn.cursor()

        # Fetch the player's TeamID
        cursor.execute("SELECT TeamID FROM Player")
        player_team_id = cursor.fetchone()[0]

        # Handle special case for TeamID 32
        cursor.execute("SELECT TeamNameLocKey FROM Teams WHERE TeamID = 32")
        special_team_name = cursor.fetchone()[0]
        special_team_name = special_team_name.split('|')[1]

        # Get the current season
        cursor.execute("SELECT CurrentSeason FROM Player_State")
        current_season = cursor.fetchone()[0]

        # Fetch data from Parts_Designs and Parts_Designs_diff, grouping by DesignID
        cursor.execute("""
            SELECT t.TeamName, pdt.name, d.DayCompleted, d.WindTunnelTime, d.CFD, pd.DesignID, pd.PreviousDesignID, AVG(pd.RandomPercent), t.TeamID, d.ValidFrom, pd.IsNegativeDifference
            FROM Parts_Designs_diff pd
            JOIN Parts_Designs d ON pd.DesignID = d.DesignID
            JOIN Teams t ON pd.TeamID = t.TeamID
            JOIN Parts_Enum_Type pdt ON pd.PartType = pdt.Value
            GROUP BY pd.DesignID
        """)
        report_data = cursor.fetchall()

        # Sort the report data by "Day Completed" in descending order
        report_data.sort(key=lambda x: x[2], reverse=True)

        # Create a new window to display the report
        report_window = tk.Toplevel(root)
        report_window.title("Modification Report")
        report_window.geometry("1250x800")  # Set the width and height of the window

        # Create a notebook widget for tabs
        notebook = ttk.Notebook(report_window)
        notebook.pack(expand=True, fill='both')

        # Create frames for the two tabs
        default_frame = tk.Frame(notebook)
        research_frame = tk.Frame(notebook)

        notebook.add(default_frame, text="Current season development")
        notebook.add(research_frame, text="Research")

        # Add the "Hide parts in development" checkbox to the default frame
        hide_var = tk.BooleanVar()
        hide_checkbox = tk.Checkbutton(default_frame, text="Hide parts in development", variable=hide_var, command=filter_treeview)
        hide_checkbox.pack(anchor='nw')

        # Create the treeviews
        tree_default = ttk.Treeview(default_frame, columns=("TEAM", "PART", "DAY COMPLETED", "WIND TUNNEL", "CFD", "DESIGN ID", "PREVIOUS DESIGN ID", "ON TRACK VS EXPECTED"), show="headings")
        tree_default.pack(side='left', expand=True, fill='both')
        tree_research = ttk.Treeview(research_frame, columns=("TEAM", "PART", "DAY COMPLETED", "WIND TUNNEL", "CFD", "DESIGN ID", "ON TRACK VS EXPECTED"), show="headings")
        tree_research.pack(side='left', expand=True, fill='both')

        # Add vertical scrollbars
        scrollbar_default = ttk.Scrollbar(default_frame, orient="vertical", command=tree_default.yview)
        scrollbar_default.pack(side='right', fill='y')
        tree_default.configure(yscrollcommand=scrollbar_default.set)

        scrollbar_research = ttk.Scrollbar(research_frame, orient="vertical", command=tree_research.yview)
        scrollbar_research.pack(side='right', fill='y')
        tree_research.configure(yscrollcommand=scrollbar_research.set)

        # Define columns and headings for both tabs
        for col in tree_default["columns"]:
            tree_default.heading(col, text=col, command=lambda c=col: sort_treeview_column(tree_default, c, False))

        for col in tree_research["columns"]:
            tree_research.heading(col, text=col, command=lambda c=col: sort_treeview_column(tree_research, c, False))

        # Apply tag configurations for colors and background
        tree_default.tag_configure("red", foreground="red")
        tree_default.tag_configure("orange", foreground="orange")
        tree_default.tag_configure("black", foreground="black")
        tree_default.tag_configure("green", foreground="green")
        tree_default.tag_configure("blue", foreground="blue")
        tree_default.tag_configure("player_team_bg", background="#ededed")

        tree_research.tag_configure("player_team_bg", background="#ededed")

        # Add data to the treeviews
        for row in report_data:
            team_name, part_name, day_completed, wind_tunnel, cfd, design_id, previous_design_id, avg_random_percent, team_id, valid_from, is_negative_difference = row

            if team_id == 32:
                team_name = special_team_name

            day_completed_display = "IN DEVELOPMENT" if day_completed == -1 else day_to_date(day_completed)

            if valid_from == current_season + 1:
                # Add to research tab
                tags = ()
                if team_id == player_team_id:
                    tags = ("player_team_bg",)
                tree_research.insert("", "end", values=(team_name, part_name, day_completed_display, wind_tunnel, cfd, design_id, "RESEARCH"), tags=tags)
            else:
                # Determine the text and color for the "ON TRACK VS EXPECTED" column based on IsNegativeDifference
                if avg_random_percent == 0:
                    rating_text = "IN DEVELOPMENT"
                    color = "black"
                elif avg_random_percent < 20:
                    rating_text = "AWFUL" if not is_negative_difference else "GREAT"
                    color = "red" if not is_negative_difference else "blue"
                elif avg_random_percent < 40:
                    rating_text = "BAD" if not is_negative_difference else "GOOD"
                    color = "orange" if not is_negative_difference else "green"
                elif avg_random_percent < 60:
                    rating_text = "AS EXPECTED"
                    color = "black"
                elif avg_random_percent < 80:
                    rating_text = "GOOD" if not is_negative_difference else "BAD"
                    color = "green" if not is_negative_difference else "orange"
                else:
                    rating_text = "GREAT" if not is_negative_difference else "AWFUL"
                    color = "blue" if not is_negative_difference else "red"

                tags = (color,)
                if team_id == player_team_id:
                    tags += ("player_team_bg",)

                tree_default.insert("", "end", values=(team_name, part_name, day_completed_display, wind_tunnel, cfd, design_id, previous_design_id, rating_text), tags=tags)

        # Adjust column widths and alignments for both treeviews
        for col in tree_default["columns"]:
            if col in ["TEAM", "PART"]:
                tree_default.column(col, width=150, anchor='w')
            else:
                tree_default.column(col, width=150, anchor='center')
                
        for col in tree_research["columns"]:
            if col in ["TEAM", "PART"]:
                tree_research.column(col, width=150, anchor='w')
            else:
                tree_research.column(col, width=150, anchor='center')

        conn.close()

    except Exception as e:
        messagebox.showerror("Error", str(e))




def day_to_date(day_number):
    base_date = datetime.datetime(1900, 1, 1)
    delta = datetime.timedelta(days=day_number - 2)
    return (base_date + delta).strftime('%Y-%m-%d')



def randomize_parts_values(option):
    try:
        conn = sqlite3.connect(db_file_path)
        cursor = conn.cursor()

        # Ensure the Parts_Designs_diff table exists
        ensure_diff_table_exists(cursor)  # This ensures the table is created if it doesn't exist

        # Call to calculate differences and store them in the Parts_Designs_diff table
        calculate_differences_and_store()

        # Step 2: Check the "name" column for "Value" 12
        cursor.execute("SELECT name FROM Parts_Enum_Stats WHERE Value=12")
        result = cursor.fetchone()
        try:
            previous_update_date = int(result[0])
        except (ValueError, TypeError):
            previous_update_date = 45341

        # Step 3: Get the current date and current season
        cursor.execute("SELECT Day, CurrentSeason FROM Player_State")
        player_state = cursor.fetchone()
        current_date = player_state[0]
        current_season = player_state[1]

        # Get the player's team ID
        cursor.execute("SELECT TeamID FROM Player")
        player_team_id = cursor.fetchone()[0]

        # Step 4: Get DesignIDs to modify based on the initial filter, excluding future season parts
        if option == 'ALL':
            cursor.execute("""
                SELECT DesignID, PartType, TeamID FROM Parts_Designs
                WHERE DayCompleted BETWEEN ? AND ? AND ValidFrom <= ?
            """, (previous_update_date, current_date, current_season))
        elif option == 'AI':
            cursor.execute("""
                SELECT DesignID, PartType, TeamID FROM Parts_Designs
                WHERE DayCompleted BETWEEN ? AND ? AND TeamID != ? AND ValidFrom <= ?
            """, (previous_update_date, current_date, player_team_id, current_season))
        elif option == 'PLAYER':
            cursor.execute("""
                SELECT DesignID, PartType, TeamID FROM Parts_Designs
                WHERE DayCompleted BETWEEN ? AND ? AND TeamID = ? AND ValidFrom <= ?
            """, (previous_update_date, current_date, player_team_id, current_season))

        designs_to_modify = cursor.fetchall()

        modifications = []
        detailed_logs = []

        difficulty_adjustment = float(difficulty_var.get())
        multiplier_value = float(multiplier_var.get())

        previous_new_values = {}
        previous_current_values = {}

        for design_id, part_type, team_id in designs_to_modify:
            # Generate a single random percentage for this DesignID
            random_percentage = random.uniform(0, 100) / 100

            # Find the previous version of the same part for the same team with the correct season constraint
            cursor.execute("""
                SELECT DesignID FROM Parts_Designs
                WHERE PartType=? AND TeamID=? AND DesignID < ? AND ValidFrom <= ?
                ORDER BY DesignID DESC LIMIT 1
            """, (part_type, team_id, design_id, current_season))
            previous_design = cursor.fetchone()

            if previous_design:
                previous_design_id = previous_design[0]

                # Get the PartStats and values for the current and previous designs
                cursor.execute("""
                    SELECT PartStat, Value FROM Parts_Designs_StatValues
                    WHERE DesignID=? 
                """, (previous_design_id,))
                previous_values = {row[0]: row[1] for row in cursor.fetchall()}

                cursor.execute("""
                    SELECT PartStat, Value FROM Parts_Designs_StatValues
                    WHERE DesignID=? 
                """, (design_id,))
                current_values = {row[0]: row[1] for row in cursor.fetchall()}

                for stat, current_value in current_values.items():
                    if stat == 15:
                        continue  # Skip processing if PartStat is 15

                    previous_value = previous_values.get(stat, None)
                    if previous_value is not None:
                        # Use existing difference from Parts_Designs_diff table
                        cursor.execute("""
                            SELECT Difference FROM Parts_Designs_diff
                            WHERE DesignID=? AND PartStat=?
                        """, (design_id, stat))
                        existing_diff = cursor.fetchone()

                        if existing_diff:
                            original_difference = existing_diff[0]
                        else:
                            continue  # Skip if no existing difference found

                        # Determine low and high values based on the original difference
                        low = previous_value

                        # Apply multiplier logic based on whether the team is the player's or an AI team
                        if team_id == player_team_id:
                            # For the player's team, the multiplier is fixed at 2
                            high = previous_value + 2 * original_difference
                        else:
                            # For AI teams, the multiplier is used as specified by the user
                            high = previous_value + 2 * (original_difference * multiplier_value)

                        # Calculate the new value using the random percentage
                        new_value = low + (high - low) * random_percentage

                        # Apply difficulty adjustment only to AI teams
                        adjustment = 0
                        if team_id != player_team_id:
                            adjustment = original_difference * (difficulty_adjustment - 1)
                            new_value += adjustment

                        new_unit_value = new_value / 10

                        # Update the database with the new value
                        cursor.execute("""
                            UPDATE Parts_Designs_StatValues
                            SET Value=?, UnitValue=?
                            WHERE DesignID=? AND PartStat=?
                        """, (new_value, new_unit_value, design_id, stat))
                        modifications.append((design_id, stat, new_value, new_unit_value))

                        # Log the details with 'Previous Current Value'
                        detailed_logs.append(
                            f"DesignID: {design_id}, PartStat: {stat}, Previous DesignID: {previous_design_id}, "
                            f"Previous Current Value: {previous_current_values.get((previous_design_id, stat), 'N/A')}, Previous Value: {previous_value}, Current Value: {current_value}, Original Diff: {original_difference}, "
                            f"Low: {low}, High: {high}, Random %: {random_percentage*100:.2f}, New Value: {new_value}, Adjustment: {adjustment}, New UnitValue: {new_unit_value}"
                        )

                        # Store whether the original difference is negative
                        is_negative_difference = original_difference < 0

                        # Insert or update the Parts_Designs_diff table with the new field
                        cursor.execute("""
                            INSERT OR REPLACE INTO Parts_Designs_diff (DesignID, PartType, PartStat, Difference, PreviousDesignID, TeamID, RandomPercent, IsNegativeDifference)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (design_id, part_type, stat, original_difference, previous_design_id, team_id, random_percentage * 100, is_negative_difference))

                        # Store the new value
                        previous_new_values[(design_id, stat)] = new_value
                        previous_current_values[(design_id, stat)] = current_value
                    else:
                        # Log when no previous value was found
                        detailed_logs.append(
                            f"DesignID: {design_id}, PartStat: {stat}, Previous DesignID: {previous_design_id}, "
                            f"Previous Current Value: N/A, Previous Value: N/A, Current Value: {current_value}"
                        )

        # Commit all changes to the database
        conn.commit()

        # Display the modifications and logs
        show_modifications(modifications, detailed_logs)

        # Step 9: Update LastEngineerDate in Parts_Enum_Stats
        cursor.execute("UPDATE Parts_Enum_Stats SET name=? WHERE Value=12", (current_date + 1,))
        conn.commit()

        conn.close()
        messagebox.showinfo("Success", "Database has been updated successfully.")

        btn_report.config(state=tk.NORMAL)  # Enable the report button

    except Exception as e:
        messagebox.showerror("Error", str(e))



def update_randomize_f1_drivers():
    try:
        conn = sqlite3.connect(db_file_path)
        cursor = conn.cursor()

        # Step 1: Get the current date from the Player_State table
        cursor.execute("SELECT Day, CurrentSeason FROM Player_State")
        player_state = cursor.fetchone()
        current_date = player_state[0]
        current_season = player_state[1]

        # Step 2: Get the last update date from the Parts_Enum_Stats table (row 13)
        cursor.execute("SELECT name FROM Parts_Enum_Stats WHERE Value=13")
        result = cursor.fetchone()
        try:
            last_update_date = int(result[0])
        except (ValueError, TypeError):
            last_update_date = 45341  # Default value if no valid date is found

        # Step 3: Calculate the number of days since the last update
        days_since_last_update = current_date - last_update_date
        log = [f"Days since last update: {days_since_last_update}"]

        # Step 4: Specify the StatIDs to be updated for drivers
        stat_ids_to_update = [2, 3, 4, 5, 6, 7, 8, 9, 10]

        # Step 5: Get all driver IDs from the Staff_PerformanceStats table
        cursor.execute("""
            SELECT DISTINCT StaffID FROM Staff_PerformanceStats
            WHERE EXISTS (
                SELECT 1 FROM Staff_DriverData WHERE StaffID = Staff_PerformanceStats.StaffID
            )
        """)
        driver_ids = cursor.fetchall()

        # Step 6: Fetch race performance data for drivers since the last update and adjust performance
        driver_performance = {}
        driver_names = {}  # Dictionary to store driver names
        for driver_id_tuple in driver_ids:
            driver_id = driver_id_tuple[0]

            # Get driver name from Staff_BasicData table
            cursor.execute("""
                SELECT FirstName, LastName, Gender FROM Staff_BasicData WHERE StaffID=?
            """, (driver_id,))
            name_data = cursor.fetchone()

            # Extract first name and last name, removing the trailing ']'
            first_name = name_data[0].split('_')[-1].rstrip(']')
            last_name = name_data[1].split('_')[-1].rstrip(']')
            driver_name = f"{first_name} {last_name}"
            driver_names[driver_id] = driver_name

            # Get all relevant race results for the driver
            cursor.execute("""
                SELECT AVG(
                    CASE 
                        WHEN Performance = 3 THEN 2 
                        ELSE Performance 
                    END + 
                    CASE 
                        WHEN FinishingPos = 1 THEN 0.35
                        WHEN FinishingPos = 2 THEN 0.15
                        WHEN FinishingPos = 3 THEN 0.05
                        ELSE 0
                    END
                ) 
                FROM (
                    SELECT rr.Performance, rr.FinishingPos
                    FROM Races_Results rr
                    JOIN Races r ON rr.RaceID = r.RaceID
                    WHERE rr.DriverID=? AND r.SeasonID=? AND r.Day > ?
                    
                    UNION ALL
                    
                    SELECT frr.Performance, frr.FinishingPos
                    FROM Races_FeatureRaceResults frr
                    JOIN Races r ON frr.RaceID = r.RaceID
                    WHERE frr.DriverID=? AND r.SeasonID=? AND r.Day > ?
                ) AS CombinedResults
            """, (driver_id, current_season, last_update_date, driver_id, current_season, last_update_date))
            avg_performance = cursor.fetchone()[0]

            if avg_performance is None:
                avg_performance = 1.05388  # Default if no race results found


            # Adjust performance as described
            adjusted_performance = max(0.210776, min(0.843104, avg_performance - 0.52694)) / 1.05388
            driver_performance[driver_id] = adjusted_performance

        # Step 7: Randomly modify the attributes for each driver and each StatID
        for driver_id_tuple in driver_ids:
            driver_id = driver_id_tuple[0]
            driver_name = driver_names.get(driver_id, "Unknown")
            log.append(f"\nDriver: {driver_name}, Stats found: {len(stat_ids_to_update)}")
            adjustment_factor = driver_performance.get(driver_id, 0.5)  # Default to 50-50 chance

            for stat_id in stat_ids_to_update:
                # Fetch the initial value for this StatID
                cursor.execute("SELECT Val FROM Staff_PerformanceStats WHERE StaffID=? AND StatID=?", (driver_id, stat_id))
                initial_value = cursor.fetchone()[0]
                current_value = initial_value
                stat_changes_made = False  # Track if any change is made for logging

                for day in range(days_since_last_update):
                    if random.random() < 0.0125:  # 1.25% chance per day
                        # Determine if we should increase or decrease based on the adjusted factor
                        if random.random() < adjustment_factor:
                            change = 1
                            color = "green"  # Increase
                        else:
                            change = -1
                            color = "red"  # Decrease
                        current_value = max(1, min(99, current_value + change))  # Ensure value stays within 0-100
                        stat_changes_made = True
                        log.append((f"  Day {day + 1}: Value changed from {current_value - change} to {current_value} for StatID {stat_id}", color))

                # If changes were made, update the value in the database
                if stat_changes_made:
                    cursor.execute("""
                        UPDATE Staff_PerformanceStats
                        SET Val=?
                        WHERE StaffID=?
                        AND StatID=?
                    """, (current_value, driver_id, stat_id))
                    conn.commit()

            if not stat_changes_made:
                log.append(f"  Done for Driver: {driver_name}.")

            # Step 8: Modify the Improvability value similarly to StatIDs using avg_performance
            cursor.execute("SELECT Improvability FROM Staff_DriverData WHERE StaffID=?", (driver_id,))
            improvability_value = cursor.fetchone()[0]

            if improvability_value is None:
                improvability_value = 50  # Default if no improvability value found

            # Log the initial Improvability value
            log.append(f"Driver: {driver_name}, Initial Improvability: {improvability_value}")

            # Adjust the Improvability value using the same factor as performance
            adjusted_improvability_factor = driver_performance.get(driver_id, 0.5)
            log.append(f"Driver: {driver_name}, Adjusted Improvability Factor: {adjusted_improvability_factor:.3f}")

            improvability_changes_made = False  # Track if any change is made for logging

            for day in range(days_since_last_update):
                if random.random() < 0.0125:  # 1.25% chance per day
                    # Determine if we should increase or decrease based on the adjusted factor
                    if random.random() < adjusted_improvability_factor:
                        change = 1
                        color = "green"  # Increase
                    else:
                        change = -1
                        color = "red"  # Decrease
                    improvability_value = max(1, min(99, improvability_value + change))  # Ensure value stays within 0-100
                    improvability_changes_made = True
                    log.append((f"  Day {day + 1}: Improvability changed from {improvability_value - change} to {improvability_value}", color))

            # If changes were made, update the value in the database
            if improvability_changes_made:
                cursor.execute("""
                    UPDATE Staff_DriverData
                    SET Improvability=?
                    WHERE StaffID=?
                """, (improvability_value, driver_id))
                conn.commit()

            if not improvability_changes_made:
                log.append(f"  No changes in Improvability for Driver: {driver_name}.")

        # Step 9: Update the last update date in the Parts_Enum_Stats table
        cursor.execute("UPDATE Parts_Enum_Stats SET name=? WHERE Value=13", (current_date,))
        conn.commit()

        conn.close()

        # Step 10: Show the log in a popup window
        log_window = tk.Toplevel(root)
        log_window.title("Update Log")
        log_text = tk.Text(log_window, wrap='word')
        log_text.pack(expand=True, fill='both')

        # Apply color formatting to the log text
        log_text.tag_configure("green", foreground="dark green")
        log_text.tag_configure("red", foreground="dark red")

        for entry in log:
            if isinstance(entry, tuple):
                log_text.insert(tk.END, entry[0] + "\n", entry[1])
            else:
                log_text.insert(tk.END, entry + "\n")

    except Exception as e:
        messagebox.showerror("Error", str(e))




# Function to show modifications in a new window
def show_modifications(modifications, detailed_logs):
    modifications_df = pd.DataFrame(modifications, columns=["DesignID", "PartStat", "Value", "UnitValue"])
    modifications_window = tk.Toplevel(root)
    modifications_window.title("Modifications")

    modifications_text = tk.Text(modifications_window)
    modifications_text.pack(expand=True, fill='both')

    modifications_text.insert(tk.END, "Modifications:\n")
    modifications_text.insert(tk.END, modifications_df.to_string(index=False))
    modifications_text.insert(tk.END, "\n\nDetailed Logs:\n")
    modifications_text.insert(tk.END, "\n".join(detailed_logs))

# GUI setup
root = tk.Tk()
root.title("F1 Manager parts upgrade modifier")

instructions = """\
1. Upload your save game to https://f1setup.cfd/
2. On the right side, click "Dump DB"
3. Select that DB by clicking the "Select DB" button below
4. Once the changes are made, return to https://f1setup.cfd/ and under "Modding", replace the database with the modified one and then select "Export savefile"
"""
instructions_label = tk.Label(root, text=instructions, justify=tk.LEFT)
instructions_label.pack(pady=10)

backup_var = tk.BooleanVar(value=True)

backup_checkbox = tk.Checkbutton(root, text="Create backup when opening DB", variable=backup_var)
backup_checkbox.pack(pady=10)

select_button = tk.Button(root, text="Select DB File", command=select_db_file)
select_button.pack(pady=10)

btn_all = tk.Button(root, text="Randomize parts for ALL teams", command=lambda: randomize_parts_values('ALL'), state=tk.DISABLED)
btn_all.pack(pady=5)

btn_ai = tk.Button(root, text="Randomize parts ONLY for AI teams", command=lambda: randomize_parts_values('AI'), state=tk.DISABLED)
btn_ai.pack(pady=5)

btn_player = tk.Button(root, text="Randomize parts ONLY for player's team", command=lambda: randomize_parts_values('PLAYER'), state=tk.DISABLED)
btn_player.pack(pady=5)

# Add "Create Report" button
btn_report = tk.Button(root, text="Create Report", command=create_report, state=tk.DISABLED)
btn_report.pack(pady=5)

difficulty_frame = tk.Frame(root)
difficulty_frame.pack(pady=10)

difficulty_label = tk.Label(difficulty_frame, text="Difficulty: (will only increase difficulty)")
difficulty_label.pack(side=tk.LEFT)

difficulty_var = tk.DoubleVar(value=1.0)
difficulty_slider = tk.Scale(difficulty_frame, from_=1.0, to=5.0, resolution=0.5, orient=tk.HORIZONTAL, variable=difficulty_var)
difficulty_slider.pack(side=tk.LEFT)

# Add the Multiplier slider
multiplier_frame = tk.Frame(root)
multiplier_frame.pack(pady=10)

multiplier_label = tk.Label(multiplier_frame, text="Multiplier: (will increase variance AND difficulty)")
multiplier_label.pack(side=tk.LEFT)

multiplier_var = tk.DoubleVar(value=1.5)
multiplier_slider = tk.Scale(multiplier_frame, from_=1.0, to=5.0, resolution=0.5, orient=tk.HORIZONTAL, variable=multiplier_var)
multiplier_slider.pack(side=tk.LEFT)

update_drivers_button = tk.Button(root, text="Update/randomize F1 drivers attributes", command=update_randomize_f1_drivers, state=tk.DISABLED)
update_drivers_button.pack(pady=10)

root.mainloop()

