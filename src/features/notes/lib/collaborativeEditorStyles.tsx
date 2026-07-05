export function CollaborativeEditorStyles() {
  return (
    <style jsx global>{`
      /* Collaboration cursor container */
      .collaboration-cursor {
        position: relative;
        display: inline;
        pointer-events: none;
      }

      /* The vertical caret line */
      .collaboration-cursor__caret {
        position: relative;
        display: inline-block;
        width: 2px;
        height: 1.1em;
        margin-left: -1px;
        margin-right: -1px;
        pointer-events: none;
        vertical-align: text-bottom;
        border-radius: 1px;
      }

      /* User name label above the caret */
      .collaboration-cursor__label {
        position: absolute;
        bottom: calc(100% + 2px);
        left: -2px;
        font-size: 10px;
        font-weight: 600;
        line-height: 1;
        white-space: nowrap;
        color: white;
        padding: 2px 6px;
        border-radius: 4px 4px 4px 0;
        user-select: none;
        pointer-events: none;
        z-index: 50;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      /* Selection highlight for other users */
      .ProseMirror .ProseMirror-yjs-selection {
        opacity: 0.3;
      }

      /* Ensure inline display in editor */
      .ProseMirror .collaboration-cursor {
        display: inline;
      }

      /* Smooth fade transitions */
      .collaboration-cursor__caret,
      .collaboration-cursor__label {
        transition: opacity 0.1s ease;
      }

      /* Collaborator avatars in header */
      .collaborator-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        font-size: 0.7rem;
        font-weight: 600;
        color: white;
        border: 2px solid var(--background);
        margin-left: -0.5rem;
      }

      .collaborator-badge:first-child {
        margin-left: 0;
      }
    `}</style>
  );
}
