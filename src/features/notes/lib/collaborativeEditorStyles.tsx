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

      /* Idle AI caret: soft breathing pulse (distinct from the native
         caret's hard blink); goes solid while the AI is typing */
      .collaboration-cursor__caret--idle {
        animation: cogno-caret-idle 1.6s ease-in-out infinite;
      }
      @keyframes cogno-caret-idle {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.25;
        }
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

      .ai-cursor {
        position: relative;
        display: inline;
        pointer-events: none;
      }

      .ai-cursor__caret {
        position: relative;
        display: inline-block;
        width: 2px;
        height: 1.15em;
        margin-left: -1px;
        margin-right: -1px;
        pointer-events: none;
        vertical-align: text-bottom;
        border-radius: 999px;
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.16);
      }

      .ai-cursor__caret::after {
        content: '';
        position: absolute;
        left: 50%;
        top: -4px;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: inherit;
        transform: translateX(-50%);
        animation: ai-cursor-pulse 1.1s ease-in-out infinite;
      }

      .ai-cursor__label {
        position: absolute;
        bottom: calc(100% + 6px);
        left: -2px;
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
        color: white;
        padding: 3px 6px;
        border-radius: 6px 6px 6px 0;
        user-select: none;
        pointer-events: none;
        z-index: 60;
        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.22);
      }

      @keyframes ai-cursor-pulse {
        0%,
        100% {
          opacity: 0.45;
          transform: translateX(-50%) scale(0.85);
        }
        50% {
          opacity: 1;
          transform: translateX(-50%) scale(1.15);
        }
      }

      /* AI focus ring: block-level highlight for the block the AI agent is
         editing (driven by the aiFocus awareness field via AiFocusExtension).
         The ring color arrives per-block through --ai-focus-color. */
      .ProseMirror .ai-focus {
        border-radius: 8px;
        transition: box-shadow 0.25s ease;
      }

      .ProseMirror .ai-focus--editing {
        box-shadow:
          0 0 0 2px var(--ai-focus-color, #0ea5e9),
          0 0 12px 0
            color-mix(in srgb, var(--ai-focus-color, #0ea5e9) 35%, transparent);
        animation: ai-focus-pulse 2s ease-in-out infinite;
      }

      /* Subtle breathing of the outer glow while the AI works */
      @keyframes ai-focus-pulse {
        0%,
        100% {
          box-shadow:
            0 0 0 2px var(--ai-focus-color, #0ea5e9),
            0 0 12px 0
              color-mix(
                in srgb,
                var(--ai-focus-color, #0ea5e9) 35%,
                transparent
              );
        }
        50% {
          box-shadow:
            0 0 0 2px
              color-mix(
                in srgb,
                var(--ai-focus-color, #0ea5e9) 70%,
                transparent
              ),
            0 0 18px 2px
              color-mix(
                in srgb,
                var(--ai-focus-color, #0ea5e9) 20%,
                transparent
              );
        }
      }

      /* Done: start from the editing ring, fade out and stay transparent */
      .ProseMirror .ai-focus--done {
        animation: ai-focus-fade 1.6s ease-out forwards;
      }

      @keyframes ai-focus-fade {
        0% {
          box-shadow:
            0 0 0 2px var(--ai-focus-color, #0ea5e9),
            0 0 12px 0
              color-mix(
                in srgb,
                var(--ai-focus-color, #0ea5e9) 35%,
                transparent
              );
        }
        100% {
          box-shadow:
            0 0 0 2px transparent,
            0 0 12px 0 transparent;
        }
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
