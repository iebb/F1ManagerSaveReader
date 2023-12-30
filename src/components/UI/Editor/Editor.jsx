import { JSONEditor } from "vanilla-jsoneditor";
import { useEffect, useRef } from "react";
import 'vanilla-jsoneditor/themes/jse-theme-dark.css';
export default function JSONEditorComponent(props) {
  const refContainer = useRef(null);
  const refEditor = useRef(null);

  useEffect(() => {
    refEditor.current = new JSONEditor({
      target: refContainer.current,
      props: {}
    });

    return () => {
      // destroy editor
      if (refEditor.current) {
        refEditor.current?.destroy();
        refEditor.current = null;
      }
    };
  }, []);

  // update props
  useEffect(() => {
    if (refEditor.current) {
      refEditor.current.updateProps(props);
    }
  }, [props]);

  return <div style={{ display: "flex", flex: 1 }} className="jse-theme-dark" ref={refContainer}></div>;
}
