export function EditorStyles() {
  return (
    <style jsx global>{`
      .ProseMirror {
        outline: none;
        min-height: 100%;
        padding: 0;
        color: var(--text-primary);
      }
      .task-description-editor .ProseMirror > :first-child {
        margin-top: 0 !important;
      }
      .ProseMirror p {
        margin: 0.9em 0;
      }
      .ProseMirror p:first-child {
        margin-top: 0;
      }
      .ProseMirror p:last-child {
        margin-bottom: 0;
      }
      .ProseMirror h1,
      .ProseMirror h2,
      .ProseMirror h3,
      .ProseMirror h4,
      .ProseMirror h5,
      .ProseMirror h6 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        font-weight: 700;
        line-height: 1.3;
        color: var(--text-primary);
      }
      .ProseMirror h1 {
        font-size: 2.25em;
        letter-spacing: -0.02em;
        border-bottom: 1px solid var(--border-default);
        padding-bottom: 0.3em;
      }
      .ProseMirror h2 {
        font-size: 1.75em;
        letter-spacing: -0.01em;
      }
      .ProseMirror h3 {
        font-size: 1.4em;
      }
      .ProseMirror h4 {
        font-size: 1.2em;
      }
      .ProseMirror h5 {
        font-size: 1.1em;
      }
      .ProseMirror h6 {
        font-size: 1em;
        color: var(--text-secondary);
      }
      .ProseMirror hr {
        margin: 1.5em 0;
        color: var(--text-muted);
      }
      .ProseMirror ul,
      .ProseMirror ol {
        padding-left: 1.5em !important;
        list-style-position: outside !important;
        margin: 0;
      }
      .ProseMirror ul {
        list-style-type: disc !important;
      }
      .ProseMirror ul li {
        display: list-item !important;
        list-style-type: disc !important;
      }
      .ProseMirror ol {
        list-style-type: decimal !important;
      }
      .ProseMirror ol li {
        display: list-item !important;
        list-style-type: decimal !important;
      }
      .ProseMirror li {
        margin: 0.75em 0;
      }
      .ProseMirror ul.task-list,
      .ProseMirror ul[data-type='taskList'] {
        list-style: none !important;
        padding-left: 0 !important;
        margin: 0;
      }
      .ProseMirror ul.task-list > li,
      .ProseMirror ul[data-type='taskList'] > li {
        list-style: none !important;
        display: flex !important;
        align-items: center;
        gap: 0.6em;
        margin: 0 !important;
        margin-top: 0.75em !important;
      }
      .ProseMirror ul.task-list > li::marker,
      .ProseMirror ul[data-type='taskList'] > li::marker {
        content: '';
      }
      .ProseMirror li.task-item,
      .ProseMirror li[data-type='taskItem'] {
        display: flex;
        align-items: center;
        gap: 1em;
        margin: 0;
      }
      .ProseMirror li.task-item > label,
      .ProseMirror li[data-type='taskItem'] > label {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        cursor: pointer;
        user-select: none;
        align-self: flex-start;
        margin: 0;
      }
      .ProseMirror li.task-item > label input[type='checkbox'],
      .ProseMirror li[data-type='taskItem'] > label input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        width: 1.5em;
        height: 1.5em;
        cursor: pointer;
        border: 2px solid var(--text-muted);
        background-color: transparent;
        border-radius: 50%;
        margin: 0;
        position: relative;
        transition: all 0.2s ease;
      }
      .ProseMirror li.task-item > label input[type='checkbox']:hover,
      .ProseMirror
        li[data-type='taskItem']
        > label
        input[type='checkbox']:hover {
        border-color: var(--text-secondary);
        transform: scale(1.1);
        box-shadow: 0 0 0 3px var(--border-default);
      }
      .ProseMirror li.task-item > label input[type='checkbox']:checked,
      .ProseMirror
        li[data-type='taskItem']
        > label
        input[type='checkbox']:checked {
        background-color: rgba(59, 130, 246, 0.8);
        border-color: rgba(59, 130, 246, 0.8);
      }
      .ProseMirror li.task-item > label input[type='checkbox']:checked::after,
      .ProseMirror
        li[data-type='taskItem']
        > label
        input[type='checkbox']:checked::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -45%) scale(1);
        color: white;
        font-size: 1em;
        font-weight: bold;
        animation: checkmarkPop 0.3s ease;
      }
      @keyframes checkmarkPop {
        0% {
          transform: translate(-50%, -45%) scale(0);
          opacity: 0;
        }
        50% {
          transform: translate(-50%, -45%) scale(1.2);
        }
        100% {
          transform: translate(-50%, -45%) scale(1);
          opacity: 1;
        }
      }
      .ProseMirror li.task-item > div,
      .ProseMirror li[data-type='taskItem'] > div {
        flex: 1;
        min-width: 0;
      }
      .ProseMirror li.task-item[data-checked='true'] > div,
      .ProseMirror li[data-type='taskItem'][data-checked='true'] > div {
      }
      .ProseMirror blockquote {
        border-left: 3px solid var(--border-default);
        padding-left: 1em;
        margin: 1em 0;
        font-style: italic;
        color: var(--text-secondary);
      }
      .ProseMirror strong {
        font-weight: 600;
      }
      .ProseMirror em {
        font-style: italic;
      }
      .ProseMirror s {
        text-decoration: line-through;
      }
      .ProseMirror p.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        float: left;
        color: var(--input-placeholder);
        pointer-events: none;
        height: 0;
      }
      .ProseMirror img.editor-image {
        max-width: 100%;
        max-height: 40rem;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 0.5rem;
        margin: 1em 0;
        display: block;
        cursor: zoom-in;
        border: 1px solid var(--border-default);
      }
      .ProseMirror img.editor-image:hover {
        border-color: var(--border-default);
      }
      .ProseMirror img.editor-image[data-attachment-id]:not([src]),
      .ProseMirror img.editor-image[data-task-attachment-load-state='loading'] {
        min-width: 7.5rem;
        min-height: 5rem;
        background: var(--surface-secondary);
      }
      .ProseMirror img.editor-image.ProseMirror-selectednode {
        outline: 2px solid rgba(59, 130, 246, 0.5);
        outline-offset: 2px;
      }
      /* Member mention styles */
      .ProseMirror .mention {
        color: rgb(96, 165, 250);
        font-weight: 600;
        cursor: pointer;
        transition: color 0.2s;
      }
      .ProseMirror .mention:hover {
        color: rgb(147, 197, 253);
      }
      /* Note mention styles */
      .ProseMirror .note-mention {
        color: rgb(22, 163, 74);
        font-weight: 600;
        cursor: pointer;
        transition: color 0.2s;
      }
      .ProseMirror .note-mention:hover {
        color: rgb(34, 197, 94);
      }
      /* AI Completion ghost text styles */
      .ProseMirror .ai-completion-ghost-text {
        color: rgb(156, 163, 175);
        opacity: 0.5;
        pointer-events: none;
        user-select: none;
        font-style: italic;
      }
      /* Hide scrollbar but keep functionality */
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      /* Diff suggestion mark styles - Monochrome */
      .ProseMirror .diff-added {
        background: var(--surface-secondary);
        border-radius: 3px;
        padding: 1px 4px;
        margin: 0 1px;
        border-bottom: 2px solid var(--text-muted);
        color: var(--text-primary);
        position: relative;
        font-weight: 500;
      }
      .ProseMirror .diff-added::before {
        content: '+';
        position: absolute;
        left: -12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 9px;
        font-weight: 700;
        color: var(--text-muted);
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .ProseMirror .diff-added:hover::before {
        opacity: 1;
      }
      .ProseMirror .diff-deleted {
        background: transparent;
        border-radius: 3px;
        padding: 1px 4px;
        margin: 0 1px;
        text-decoration: line-through;
        text-decoration-thickness: 1.5px;
        text-decoration-color: var(--text-muted);
        color: var(--text-muted);
        position: relative;
      }
      .ProseMirror .diff-deleted::before {
        content: '−';
        position: absolute;
        left: -12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 9px;
        font-weight: 700;
        color: var(--text-muted);
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .ProseMirror .diff-deleted:hover::before {
        opacity: 1;
      }
      /* Diff suggestion transitions and hover effects */
      .ProseMirror [data-diff-suggestion] {
        transition: all 0.2s ease;
        cursor: default;
      }
      .ProseMirror [data-diff-suggestion]:hover {
        filter: brightness(1.15);
        transform: translateY(-1px);
      }
      /* Animation for newly inserted suggestions */
      @keyframes diffPulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }
      .ProseMirror .diff-added,
      .ProseMirror .diff-deleted {
        animation: diffPulse 2s ease-in-out 1;
      }

      /* ========== Per-User Ownership Styles ========== */

      /* Owner styles - full color, interactive */
      .ProseMirror .diff-owner {
        cursor: pointer;
      }

      /* Other user styles - muted, read-only appearance */
      .ProseMirror .diff-other-user {
        opacity: 0.6;
        filter: saturate(0.5);
        cursor: not-allowed;
      }
      .ProseMirror .diff-other-user::before {
        display: none;
      }

      /* ========== Block-Level Diff Styles ========== */

      /* Block wrapper - NodeView container */
      .diff-block-wrapper {
        position: relative;
        margin: 0.75em 0;
        border-radius: 8px;
        padding: 12px 16px 20px 32px;
      }

      /* Block added styles - Monochrome */
      .diff-block-added-view {
        background: var(--surface-primary);
        border: 1px solid var(--border-default);
        border-left: 3px solid var(--text-muted);
      }

      /* Block deleted styles - Monochrome */
      .diff-block-deleted-view {
        background: transparent;
        border: 1px dashed var(--border-default);
        border-left: 3px solid var(--text-muted);
      }
      .diff-block-deleted-view .diff-block-inner-content {
        text-decoration: line-through;
        text-decoration-color: var(--text-muted);
        opacity: 0.5;
      }

      /* Block ownership styles */
      .diff-block-owner-view {
        opacity: 1;
      }
      .diff-block-other-view {
        opacity: 0.6;
        filter: saturate(0.5);
      }
      .diff-block-other-view .diff-block-actions {
        display: none;
      }

      /* Block indicator label */
      .diff-block-indicator {
        position: absolute;
        top: -10px;
        left: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .diff-block-indicator-added {
        color: var(--text-primary);
        background: var(--interactive-hover);
        padding: 2px 8px;
        border-radius: 4px;
      }
      .diff-block-indicator-deleted {
        color: var(--text-muted);
        background: var(--border-subtle);
        padding: 2px 8px;
        border-radius: 4px;
      }
      .diff-block-other-user-label {
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 400;
        text-transform: none;
      }

      /* Block content area */
      .diff-block-content {
        min-height: 1em;
      }
      .diff-block-inner-content {
        outline: none;
      }
      .diff-block-inner-content p {
        margin: 0;
      }

      /* Block action buttons (Bottom Right Style) */
      .diff-block-actions {
        position: absolute;
        bottom: 8px;
        right: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 10;
      }
      .diff-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: transparent;
      }
      .diff-action-accept {
        color: rgba(34, 197, 94, 0.8);
        background: rgba(34, 197, 94, 0.1);
        border: 1px solid rgba(34, 197, 94, 0.25);
      }
      .diff-action-accept:hover {
        background: rgba(34, 197, 94, 0.25);
        color: rgb(34, 197, 94);
        border-color: rgba(34, 197, 94, 0.5);
        transform: scale(1.05);
      }
      .diff-action-reject {
        color: var(--text-secondary);
        border: 1px solid var(--border-default);
      }
      .diff-action-reject:hover {
        background: rgba(239, 68, 68, 0.2);
        color: rgb(239, 68, 68);
        border-color: rgba(239, 68, 68, 0.4);
        transform: scale(1.05);
      }

      /* ========== Inline Diff Buttons ========== */
      .inline-diff-button-wrapper {
        display: inline;
        vertical-align: baseline;
      }
      .inline-diff-buttons {
        display: inline-flex;
        align-items: center;
        margin-left: 4px;
        gap: 2px;
        vertical-align: middle;
      }
      .inline-diff-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        transition: all 0.12s ease;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
      }
      .inline-diff-accept {
        background: var(--interactive-hover);
        color: var(--text-secondary);
      }
      .inline-diff-accept:hover {
        background: var(--text-primary);
        color: var(--background);
      }
      .inline-diff-reject {
        background: var(--border-subtle);
        color: var(--text-muted);
      }
      .inline-diff-reject:hover {
        background: var(--text-muted);
        color: var(--text-primary);
      }
    `}</style>
  );
}
