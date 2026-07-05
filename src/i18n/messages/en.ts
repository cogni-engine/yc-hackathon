export const en = {
  common: {
    loading: 'Loading...',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    or: 'OR',
    upload: 'Upload',
    processing: 'Processing...',
    generate: 'Generate',
    generating: 'Generating...',
    remove: 'Remove',
    removing: 'Removing...',
    delete: 'Delete',
    deleting: 'Deleting...',
    goBack: 'Go back',
    back: 'Back',
    rename: 'Rename',
    close: 'Close',
  },
  entities: {
    task: 'Task',
    tasks: 'Tasks',
    comment: 'Comment',
    comments: 'Comments',
    workspace: 'Workspace',
    workspaces: 'Workspaces',
    note: 'Note',
    notes: 'Notes',
    project: 'Project',
    projects: 'Projects',
    inbox: 'Inbox',
    meeting: 'Meeting',
    meetings: 'Meetings',
  },
  nav: {
    cogno: 'Cogno',
    personal: 'Personal',
    userSettings: 'User Settings',
    settings: 'Settings',
    backToApp: 'Back to app',
    account: 'Account',
    yourWorker: 'Your Worker',
    integrations: 'Integrations',
    more: 'More',
    create: 'Create',
    newTask: 'New task',
    newMeeting: 'New meeting',
    newProject: 'New project',
    general: 'General',
    members: 'Members',
    memory: 'Memory',
    apiKeys: 'API Keys',
    workers: 'Workers',
    addWorker: 'Add worker',
    workerHub: 'Worker Hub',
    background: 'Background',
    capabilities: 'Add-ons',
    activity: 'Activity',
    savedViews: 'Views',
    createView: 'Create view',
    newViewName: 'New view',
    collapseSidebar: 'Collapse sidebar',
    openSidebar: 'Open sidebar',
    resizeSidebar: 'Resize sidebar',
    dragToResize: 'Drag to resize',
    clickToCollapse: 'Click to collapse',
    savedViewDefault: 'Default',
    savedViewShared: 'Shared',
    savedViewPrivate: 'Private',
    renameSavedView: 'Rename saved view',
    deleteSavedViewConfirm: 'Delete saved view "{{name}}"?',
  },
  integrations: {
    notion: {
      connectedPages: {
        title: 'Connected pages',
        changePages: 'Change pages',
        opening: 'Opening...',
        loading: 'Loading...',
        loadError: 'Failed to load Notion pages.',
        empty: 'No pages connected.',
        truncated: 'Showing the first {{count}} connected items.',
        lastEdited: 'Last edited {{date}}',
        openInNotion: 'Open {{title}} in Notion',
        objectTypes: {
          page: 'Page',
          database: 'Database',
          dataSource: 'Data source',
        },
      },
      exportImport: {
        title: 'Export import',
        noFile: 'No export selected',
        helper: 'Use a Notion Markdown & CSV export ZIP.',
        chooseZip: 'Choose ZIP',
        previewing: 'Previewing...',
        reset: 'Reset',
        previewRows: 'Preview rows',
        exportRows: 'Export rows',
        mapping: 'Mapping',
        aiMapping: 'AI',
        heuristicMapping: 'Structured',
        mappedFields: 'Mapped fields',
        importTasks: 'Import tasks',
        importing: 'Importing...',
        importedResult: 'Imported {{count}} tasks. Skipped {{skipped}} rows.',
      },
    },
  },
  auth: {
    signInWithGoogle: 'Sign in with Google',
    signInWithApple: 'Sign in with Apple',
    signUpWithGoogle: 'Sign up with Google',
    signUpWithApple: 'Sign up with Apple',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    createAccount: 'Create account',
    creatingAccount: 'Creating Account...',
    noAccountPrefix: "Don't have an account?",
    alreadyHaveAccountPrefix: 'Already have an account?',
    forgotPasswordPrefix: 'Forgot password? You can reset it',
    here: 'here',
    passwordUpdated:
      'Password updated successfully! Please sign in with your new password.',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    verifyEmailTitle: 'Verify your email',
    verifyEmailMessage:
      'Please verify your email address by clicking the link sent to',
    resendVerificationEmail: 'Resend Verification Email',
    questionsEmailPrefix: 'Questions? Email us at',
    thanks: 'Thanks,',
    cognoTeam: 'Cogno Team',
    legalConsentError:
      'Please agree to the Terms of Service and acknowledge the Privacy Policy.',
    legal: {
      agreePrefix: 'I agree to the',
      terms: 'Terms of Service',
      andAcknowledge: 'and acknowledge the',
      privacy: 'Privacy Policy',
      socialPrefix: 'By continuing with Google or Apple, you agree to the',
    },
    forgot: {
      title: 'Reset your password',
      description:
        "Enter your email address and we'll send you a link to reset your password",
      checkEmailTitle: 'Check your email',
      checkEmailDescription: "We've sent a password reset link to",
      sendResetLink: 'Send reset link',
      sending: 'Sending...',
      backToLogin: 'Back to login',
    },
    reset: {
      title: 'Set new password',
      description: 'Enter your new password below',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      passwordsDoNotMatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      updatePassword: 'Update password',
      updatingPassword: 'Updating password...',
    },
    error: {
      fallback: 'An error occurred during authentication',
      verificationFailed: 'Verification Failed',
      tryLoggingIn: 'Try Logging In',
      signUpAgain: 'Sign Up Again',
    },
  },
  settings: {
    pageDescription:
      'Manage your profile, preferences, shortcuts, and account security.',
    loading: 'Loading...',
    signInRequired: 'Sign in to manage settings.',
    avatarAlt: 'User avatar',
    imageOpenError:
      'Could not open the selected image. Please try another file.',
    nameNoChanges: 'No changes to save.',
    nameUpdated: 'Name updated successfully.',
    nameUpdateError: 'Something went wrong while updating your name.',
    avatarUpdated: 'Avatar updated successfully.',
    avatarSaveError: 'Something went wrong while saving your avatar.',
    avatarRemoved: 'Avatar removed.',
    avatarRemoveError: 'Unable to remove avatar. Please try again.',
    avatarGenerated: 'Avatar generated successfully.',
    avatarGenerateError: 'Failed to generate avatar. Please try again.',
    photo: 'Photo',
    cropAvatar: 'Crop avatar',
    cropAvatarDescription:
      'Adjust the crop to center your face. The result will be a square image.',
    noImageSelected: 'No image selected.',
    zoom: 'Zoom',
    saveAvatar: 'Save avatar',
    name: 'Name',
    visibleToCollaborators: 'Visible to collaborators.',
    displayName: 'Display name',
    displayNamePlaceholder: 'Add your display name',
    accountsDescription: 'Switch accounts, add another account, or log out.',
    theme: 'Theme',
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    languageDescription:
      'Choose the language used for explanations, messages, and settings.',
    languageSaved: 'Language updated.',
    languageSaveError: 'Failed to update language. Please try again.',
    languageOptions: {
      en: 'English',
      ja: 'Japanese',
    },
    keyboardShortcuts: 'Keyboard Shortcuts',
    keyboardDescription: 'Customize ⌘ shortcuts',
    toggleSidebar: 'Toggle Sidebar',
    toggleTaskPanel: 'Toggle Task Panel',
    shortcutDuplicate: '"{{key}}" is already assigned to another shortcut.',
    shortcutSaveError: 'Failed to save shortcut. Please try again.',
    shortcutResetError: 'Failed to reset shortcuts. Please try again.',
    resetToDefaults: 'Reset to defaults',
    navigation: 'Navigation',
    navigationDescription: 'Switch between views',
    goToStudio: 'Go to Studio',
    goToWorkspace: 'Go to Workspace',
    deleteAccount: 'Delete Account',
    deleteAccountAction: 'Delete account',
    deleteAccountPermanent: 'Permanent and irreversible.',
    deleteAccountTitle: 'Delete account',
    deleteAccountConfirm: 'Are you sure? This cannot be undone.',
    deleteAccountWill: 'This will:',
    deleteAccountNotesTasks: 'Delete all your notes and tasks',
    deleteAccountWorkspaces: 'Remove you from all workspaces',
    deleteAccountProfile: 'Delete your profile data',
    deleteAccountPermanentWarning: 'This action is permanent.',
    deleteAccountConfirmAction: 'Yes, delete my account',
  },
  accountMenu: {
    openUserMenu: 'Open user menu',
    accounts: 'Accounts',
    loadingAccounts: 'Loading accounts',
    noSavedAccounts: 'No saved accounts',
    addAccount: 'Add account',
    switchAccount: 'Switch account',
    addGoogleAccount: 'Add Google account',
    addAppleAccount: 'Add Apple account',
    currentAccount: 'Current',
    adding: 'Adding',
    switching: 'Switching',
    signOut: 'Log out',
    signingOut: 'Signing out...',
    loadAccountsError: 'Failed to load accounts',
    switchAccountError: 'Failed to switch account',
    addAccountError: 'Failed to add account',
  },
  tasks: {
    pageTitle: 'Tasks',
    pageDescription: 'Create, filter, and move work across your workspace.',
    failedLoad: 'Failed to load tasks',
    retry: 'Retry',
    filter: 'Filter',
    saveView: 'Save View',
    switchView: 'Switch task view ({{view}})',
    newTask: 'New Task',
    createDialog: {
      create: 'Create',
      creating: 'Creating...',
    },
    search: 'Search',
    searchByName: 'Search tasks by title or number',
    searchByNamePlaceholder: 'Search title or #123...',
    clearNameSearch: 'Clear search',
    searchMembersPlaceholder: 'Search members...',
    viewModes: {
      list: 'List',
      board: 'Board',
      calendar: 'Calendar',
      gantt: 'Gantt',
    },
    boardGroups: {
      status: 'Status',
      assignee: 'User',
      project: 'Project',
    },
    boardStatusFilter: {
      ariaLabel: 'Filter board by status',
      label: 'Status',
      count: '{{count}} status',
    },
    descriptionHistory: {
      title: 'Description history',
      savedVersions: '{{count}} saved versions',
      recoverPreviousEdits: 'Recover previous edits',
      closeAria: 'Close description history',
      emptyTitle: 'No versions yet',
      emptyBody:
        'Versions appear after AI or human edits change this description.',
      emptyDescription: 'Empty description',
      restoreConfirm: 'Restore this version?',
      restore: 'Restore',
      restoredFrom: 'from v{{version}}',
      loadHistory: 'Load description history',
      loadingHistory: 'Loading description history',
      previousVersion: 'Previous version',
      nextVersion: 'Next version',
      actorAi: 'AI',
      actorHuman: 'Human',
      unknownAuthor: 'Unknown',
      memberFallback: 'Member #{{id}}',
    },
    mermaid: {
      showDiagram: 'Show diagram',
      showCode: 'Show code',
      expandDiagram: 'Expand diagram',
      expandedDiagramTitle: 'Expanded mermaid diagram',
      closeExpandedDiagram: 'Close expanded mermaid diagram',
      invalidSyntax: 'Invalid mermaid syntax',
    },
    tags: {
      label: 'Tags',
      editAria: 'Edit task tags',
      searchPlaceholder: 'Search or create tag...',
      empty: 'No tags found',
      noTag: 'No tag',
      loading: 'Loading tags...',
      create: 'Create "{{name}}"',
      createNew: 'Create tag',
      add: 'Add tag',
      removeAria: 'Remove {{name}} tag',
      namePlaceholder: 'Tag name',
      editTagAria: 'Edit {{name}} tag',
      deleteTagAria: 'Delete {{name}} tag',
      cancelEditAria: 'Cancel tag edit',
      saveEditAria: 'Save tag edit',
      assignError:
        'Task was created, but tags could not be assigned. Adjust tags and retry.',
      retryAssign: 'Retry tag assignment',
      finishWithoutTags: 'Finish without tags',
    },
  },
  comments: {
    loading: 'Loading...',
    empty: 'No comments yet.',
    writePlaceholder: 'Write a comment...',
    replyPlaceholder: 'Reply...',
    send: 'Send',
    addAttachment: 'Add attachment',
    attachFile: 'Attach file',
    removeAttachment: 'Remove {{filename}}',
    attachmentUploading: 'Uploading...',
    attachmentUploadFailed: 'Failed',
    attachmentUploadError: 'Failed to upload attachment.',
    attachmentLimit: 'You can attach up to {{count}} files.',
    downloadAttachment: 'Download {{filename}}',
    attachmentDownloadError: 'Failed to download attachment.',
    attachmentPreviewUnavailable: 'Preview unavailable',
    jumpToUnread: 'Jump to unread',
  },
  inbox: {
    pageDescription: 'Mentions and replies that need your attention.',
    untitledTask: 'Untitled Task',
    tabs: {
      all: 'All',
      mentions: 'Mentions',
      replies: 'Replies',
    },
    groups: {
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      earlier: 'Earlier',
    },
    actions: {
      markAllRead: 'Mark all read',
      showRead: 'Show read',
      showingAll: 'Hide read',
      loadMore: 'Load more',
    },
    error: {
      failedLoad: 'Failed to load inbox',
      unknown: 'Unknown error',
    },
    empty: {
      allCaughtUp: 'All caught up!',
      noNotifications: 'No notifications yet',
      noMentions: 'No mentions yet',
      noReplies: 'No replies yet',
      showReadNotifications: 'Show read notifications',
      allDescription:
        "You'll see notifications here when someone mentions you or replies to your comments.",
      mentionDescription:
        "You'll see notifications here when someone @mentions you in a task description or comment.",
      replyDescription:
        "You'll see notifications here when someone replies to your comments.",
    },
    item: {
      mentionedYou: 'mentioned you',
      mentionedYouInDescription: 'mentioned you in the description',
      repliedToYourComment: 'replied to your comment',
      unknownActor: 'Unknown',
      unreadSuffix: ' (unread)',
      ariaLabel: '{{actor}} {{action}} in {{task}}{{unread}}',
      closeReply: 'Close reply',
      reply: 'Reply',
      replyPlaceholder: 'Write a reply...',
      memberFallback: 'Member #{{id}}',
    },
  },
  projectsPage: {
    description: 'Group tasks around outcomes, dates, and progress.',
    newProject: 'New Project',
    newProjectName: 'New Project',
    namePlaceholder: 'project-name',
    createHelper:
      'Projects group tasks around outcomes, dates, and progress. Use a short, recognizable name.',
    emptyTitle: 'No projects yet',
    emptyDescription: 'Create a project to organize your tasks',
    taskCount: '{{count}} {{label}}',
    taskSingular: 'task',
    taskPlural: 'tasks',
    detail: {
      notFound: 'Project not found',
      projectNamePlaceholder: 'Project name',
      start: 'Start',
      target: 'Target',
      setDate: 'Set date',
      descriptionPlaceholder: 'Add a description...',
      progress: 'Progress',
      progressText: '{{completed}} of {{total}} tasks completed',
      addTask: 'Add task',
      noTasks: 'No tasks in this project',
      deleteProject: 'Delete project',
      deleteTitle: 'Delete project',
      deleteDescription:
        'This project has {{count}} {{taskLabel}}. Deleting it cannot be undone.',
    },
  },
  workspaceSettings: {
    invalidWorkspace: 'Invalid workspace.',
    failedLoad: 'Failed to load workspace settings.',
    generalDescription:
      'Manage workspace identity, task imports, and workspace-level controls.',
    loading: 'Loading...',
    icon: 'Icon',
    workspaceIconAlt: 'Workspace icon',
    imageOpenError:
      'Could not open the selected image. Please try another file.',
    uploadImage: 'Upload image',
    workspaceName: 'Workspace Name',
    workspaceNamePlaceholder: 'Add a workspace name',
    workspaceNameRequired: 'Workspace name is required.',
    workspaceNameUpdated: 'Workspace name updated successfully.',
    workspaceNameUpdateError:
      'Unable to update workspace name. Please try again.',
    promptLanguage: 'Agent prompt language',
    promptLanguageDescription:
      'Choose the language Cogno uses for workspace-level agent instructions and comments.',
    promptLanguageOptions: {
      en: 'English',
      ja: 'Japanese',
    },
    noChanges: 'No changes to save.',
    iconUpdated: 'Workspace icon updated successfully.',
    iconUpdateError: 'Unable to update workspace icon. Please try again.',
    iconGenerated: 'Workspace icon generated successfully.',
    iconGenerateError: 'Failed to generate workspace icon. Please try again.',
    iconRemoved: 'Workspace icon removed.',
    iconRemoveError: 'Unable to remove workspace icon. Please try again.',
    cropIconTitle: 'Adjust workspace icon',
    cropIconDescription:
      'Center the important part of the image. The final icon will be a square.',
    saveIcon: 'Save icon',
    taskImport: {
      title: 'Task import',
      docs: 'Docs',
      dropTitle: 'Drag and drop a task CSV',
      dropDescription:
        'Drop the file anywhere in this area. Cogno will open column mapping before creating tasks.',
      chooseCsv: 'Choose Task CSV',
      supported:
        'Linear, Notion, GitHub, Asana, and Jira CSV exports are supported.',
    },
    demo: {
      title: 'Demo',
      reset: 'Reset demo',
      resetting: 'Resetting...',
      description: 'Put every task back to its "no button pressed yet" state.',
      success:
        'Reset done: {{actions}} action(s) re-armed, {{replies}} reply(ies) removed, {{jobs}} dispatched job(s) cleared, {{tasks}} task change(s) reverted.',
      failed: 'Failed to reset demo workspace.',
      dialogTitle: 'Reset demo workspace',
      dialogDescription:
        'Returns this workspace to its "no button pressed yet" state.',
      thisWill: 'This will:',
      rearmButtons: 'Re-arm every Block Kit button (back to actionable)',
      removeReplies: 'Remove the agent reply comments those buttons produced',
      clearWork: 'Cancel and clear any dispatched agent work',
      revertTasks: 'Revert task status / assignee changes the buttons made',
      safeRepeatedly:
        'Safe to run repeatedly. Only affects this demo workspace.',
    },
    danger: {
      title: 'Danger Zone',
      deleteWorkspace: 'Delete Workspace',
      permanent: 'Permanent and irreversible.',
      deleting: 'Deleting...',
      action: 'Delete workspace',
      dialogTitle: 'Delete workspace',
      dialogDescription: 'Are you sure? This cannot be undone.',
      thisWill: 'This will:',
      deleteNotes: 'Delete all notes and chat history',
      removeMembers: 'Remove all members from this workspace',
      deleteData: 'Delete all workspace data',
      typeToConfirm: 'Type {{name}} to confirm.',
      renameFirst: '(rename first)',
      workspaceNamePlaceholder: 'Workspace name',
      missingName: 'Please set a workspace name before deleting.',
      mismatch: 'Workspace title does not match.',
      deleteError: 'Failed to delete workspace. Please try again.',
      confirmAction: 'Yes, delete workspace',
    },
    members: {
      description: 'Invite and review workspace members.',
      invite: 'Invite',
      edit: 'Edit',
      done: 'Done',
      failedLoad: 'Failed to load members',
      empty: 'No members in this workspace',
      joined: 'Joined {{date}}',
      editProfile: 'Edit member profile',
      editProfileFor: 'Edit {{name}} member profile',
      removeConfirm: 'Remove this member?',
      makeOwner: 'Make owner',
      makeMember: 'Make member',
    },
    apiKeys: {
      description: 'Create and revoke CLI or worker tokens for this workspace.',
      create: 'Create',
      failedLoad: 'Failed to load API keys',
      helpPrefix:
        'API keys authenticate worker daemons without JWT refresh. Use',
      helpSuffix: 'to configure the CLI.',
      empty: 'No API keys yet. Create one to authenticate worker daemons.',
      unnamed: 'Unnamed key',
      created: 'Created {{date}}',
      lastUsed: 'Last used {{date}}',
      revokeConfirm:
        'Revoke this key? Workers using it will lose access immediately.',
      revoke: 'Revoke',
      createdTitle: 'API key created',
      createdDescription:
        "Copy this key now. You won't be able to see it again.",
      useItWith: 'Use it with:',
      createTitle: 'Create API key',
      nameOptional: 'Name (optional)',
      namePlaceholder: 'e.g. My laptop worker',
      creating: 'Creating...',
    },
    memory: {
      description: 'Workspace summary used by AI on each wake.',
      failedLoad: 'Failed to load: {{message}}',
      failedSave: 'Failed to save: {{message}}',
      saved: 'Saved.',
      revert: 'Revert',
      preview: 'Preview',
      chars: '{{count}} chars',
      detail:
        'Workspace-wide summary the AI reads on wake. Editable as Markdown.',
      lastUpdated: 'Last updated: {{date}}',
      loading: 'Loading...',
      emptyPrefix: 'Memory is empty. Click',
      emptySuffix: 'to add content.',
      placeholder: '### Workspace Status Report ...',
    },
    workers: {
      description: 'Monitor worker liveness and recent agent jobs.',
      tabs: {
        workerHub: 'Worker Hub',
        monitor: 'Monitor',
        machines: 'Machines',
        history: 'History',
      },
      failedLoad: 'Failed to load workers',
      onlineSummary: '{{online}} online · {{total}} total',
      refresh: 'Refresh',
      helpPrefix: 'CLI workers register here when running',
      helpSuffix:
        "Liveness is derived from each worker's heartbeat. A worker that stops reporting within two minutes shows as stale, then offline. This view auto-refreshes every 10 seconds.",
      failedWorkHistory: 'Failed to load work history',
      agentWork: 'Agent work',
      itemCount: '{{count}} {{label}}',
      itemSingular: 'item',
      itemPlural: 'items',
      recentWork:
        'The 50 most recent work items dispatched to your workers: pending, running, completed, and failed.',
      emptyWorkers:
        'No workers registered yet. Start the CLI with {{command}} to register one.',
      emptyWorkersPrefix: 'No workers registered yet. Start the CLI with',
      emptyWorkersSuffix: 'to register one.',
      unknownMachine: 'Unknown machine',
      heartbeat: 'Heartbeat {{time}}',
      currentWork: '{{status}} · work #{{id}}',
      noCurrentWork: 'No current work',
      hardware: {
        cores: '{{count}} cores',
        ram: '{{size}} RAM',
        disk: '{{free}} free of {{total}}',
      },
      machines: {
        empty: 'No machines yet.',
        summary: '{{machines}} machines · {{workers}} workers online',
        online: 'online',
        offline: 'offline',
        workerCount: '{{online}}/{{total}} workers',
        noHardware: 'Hardware not reported yet',
        environments: 'Environments ({{count}})',
        registered: 'registered',
        adhoc: 'unregistered',
        noWorker: 'no worker',
      },
      emptyWork: 'No agent work yet.',
      viewPr: 'View PR',
      moreActions: 'More actions',
      viewDetails: 'View details',
      cancelTask: 'Cancel task',
      cancelling: 'Cancelling…',
      cancelFailed: 'Failed to cancel task',
      removeWorker: 'Remove worker',
      starting: 'Starting...',
      startingWorker: 'Starting worker...',
      taskCounts: {
        claimable: '{{count}} ready',
        completed: '{{count}} done',
      },
      executorSelector: {
        selectLabel: 'Select executor model',
        stopBeforeChanging: 'Stop workers before changing the default model',
        loadingModels: 'Loading models…',
        retry: 'Retry',
        unavailable: 'Unavailable',
      },
      visualCapture: {
        label: 'visual capture',
        optional: 'optional',
        setupTitle: 'Optional: Enable visual previews',
        setupDescription:
          'Install Playwright and its Chromium browser on this machine so spec and implementation runs can attach UI screenshots to the task description. Expect about 300 MB of browser disk space; Linux may also install system packages.',
        installCommandLabel: 'visual preview install command',
        installButton: 'Install visual previews',
        workerNeedsPlaywright: 'Worker ready · visual previews need Playwright',
        ready: 'ready',
        notInstalled: 'not installed',
      },
      capabilities: {
        title: 'Add-ons',
        description:
          'Choose the AI tool this computer uses, then enable optional helpers.',
        summary: '{{tools}} AI tools ready · {{addOns}} helpers ready',
        summaryReadinessUnknown:
          'AI tool readiness unavailable · {{addOns}} helpers ready',
        loading: 'Checking worker add-ons...',
        desktopOnly:
          'Worker add-ons can only be managed from the Cogno desktop app.',
        loadError: 'Could not check worker add-ons.',
        aiToolModelMissing: 'No model is available for this AI tool.',
        aiToolModel: 'Model: {{model}}',
        aiToolChooser: {
          title: 'Choose an AI tool',
          description:
            'Pick what this worker should use. If the tool is not ready on this computer, finish its setup before starting the worker.',
          selected: 'Selected',
          reasonFallback: 'not ready',
          modelLabel: 'Default model: {{model}}',
          chooseAndSetUp: 'Choose and set up',
          continue: 'Continue',
          dismiss: 'Not now',
        },
        sections: {
          aiTool: {
            title: 'AI tool',
            description: 'Pick what Cogno uses to run work on this computer.',
          },
          optionalHelpers: {
            title: 'Optional helpers',
            description:
              'These improve what workers can do, but are not required to start.',
          },
        },
        status: {
          ready: 'Ready',
          needsSetup: 'Needs setup',
          selected: 'Selected',
        },
        actions: {
          refresh: 'Refresh',
          retry: 'Retry',
          setUp: 'Set up',
          install: 'Install',
          reinstall: 'Reinstall',
          signIn: 'Sign in',
          check: 'Check',
          manage: 'Manage',
          useThis: 'Use this',
          verify: 'Verify',
          copyCommand: 'Copy command',
        },
        aiTools: {
          empty: 'No AI tools are available on this WOD version.',
          setupTitle: 'Set up {{tool}}',
          readyTitle: '{{tool}} is ready',
          setupSubtitle:
            'Finish these steps on this computer, then verify the result.',
          verifyTitle: 'Verify',
          verifyDescription:
            'Re-check this computer and update the worker status.',
          claude: {
            description: 'Run worker tasks with Claude Code on this computer.',
            installTitle: 'Install Claude Code',
            installDescription:
              'Claude Code is installed from npm. Install Node.js first if npm is missing.',
            signInTitle: 'Sign in to Claude Code',
            signInDescription:
              'Run the login command and complete the browser sign-in flow.',
            docsLabel: 'Claude Code documentation',
          },
          codex: {
            description: 'Run worker tasks with Codex on this computer.',
            installTitle: 'Install Codex',
            installDescription:
              'Install the Codex CLI and make sure the codex command is on PATH.',
            signInTitle: 'Sign in to Codex',
            signInDescription:
              'Open Codex once and complete the sign-in flow it shows.',
            docsLabel: 'Codex CLI documentation',
          },
        },
        visualCapture: {
          title: 'Visual Capture',
          category: 'Visual previews',
          description: 'Attach screenshots to implementation and review tasks.',
          terminalTitle: 'Installing visual capture',
        },
        githubCli: {
          title: 'GitHub CLI',
          category: 'Pull requests',
          description:
            'Create PRs, inspect checks, and resolve review threads.',
          notInstalled: 'not installed',
          authTerminalTitle: 'Signing in to GitHub CLI',
          statusTerminalTitle: 'Checking GitHub CLI status',
        },
      },
      background: {
        title: 'Background',
        desktopOnly:
          'Worker background settings can only be managed from the Cogno desktop app.',
        keepRunning: 'Run Cogno in background',
        keepRunningDescription: 'Resume work when this device wakes.',
        sleepBehavior: 'When inactive',
        recommended: 'Recommended',
        updateAvailable:
          'A newer worker engine is available and will be applied automatically.',
        needHelp: 'Need help?',
        stopActivity: 'Stop background activity',
        stoppingActivity: 'Stopping...',
        stopDialogTitle: 'Stop background activity?',
        stopDialogDescription:
          'Cogno will stop running in the background on this device. Any active local work may be interrupted. You can turn it back on from this page.',
        confirmStopActivity: 'Stop background activity',
        stopFailed: 'Could not stop background activity. Try again.',
        sleepModes: {
          sleepResume: 'Sleep normally',
          keepAwakeActive: 'Stay awake while working',
          alwaysAwake: 'Always stay awake',
        },
      },
      detail: {
        back: 'Back to history',
        clearSelection: 'Clear selection',
        emptyTitle: 'Select a work item',
        emptyDescription:
          'Choose a history item to inspect status, owner, routing, timing, and logs.',
        loading: 'Loading work item...',
        notFound: 'This work item is no longer available.',
        intent: 'Intent',
        type: 'Type',
        worker: 'Worker',
        owner: 'Owner',
        task: 'Task',
        routingReason: 'Routing reason',
        created: 'Created',
        claimed: 'Claimed',
        started: 'Started',
        completed: 'Completed',
        duration: 'Duration',
        error: 'Error',
        summary: 'Summary',
        log: 'Activity log',
      },
      liveness: {
        active: 'Active',
        idle: 'Idle',
        stale: 'Stale',
        offline: 'Offline',
      },
      workStatus: {
        completed: 'Completed',
        failed: 'Failed',
        running: 'Running',
        claimed: 'Claimed',
        pending: 'Pending',
        cancelled: 'Cancelled',
      },
    },
    activity: {
      description: 'Recent task changes in this workspace.',
      loading: 'Loading activity...',
      empty: 'No activity yet',
      system: 'System',
    },
  },
  taskImport: {
    dropzone: {
      title: 'Drag and drop task CSVs',
      description:
        'Drop one or more CSV files in this area, or choose them from your computer.',
      chooseCsv: 'Choose Task CSV',
      uploadedFiles: 'Uploaded CSV files',
      uploadedDescription: 'Select a file number to review its mapping.',
      fileStats: '{{rows}} rows, {{columns}} columns{{issues}}{{readiness}}',
      issueSingular: 'issue',
      issuePlural: 'issues',
      needsMapping: 'needs mapping',
      removeFile: 'Remove {{fileName}}',
    },
    dialog: {
      title: 'Import Tasks',
      description:
        'Upload CSV files, confirm how each column maps to Cogno, then review the generated task preview.',
      uploadFirst: 'Upload one or more CSV files first.',
      completeMappings: 'Mark mapping complete for every CSV before importing.',
      importingProgress: 'Importing {{completed}}/{{total}}',
      importing: 'Importing...',
      imported: 'Imported',
      importCsv: 'Import {{count}} CSV{{plural}}',
      import: 'Import',
      csvShapeError:
        '{{fileName}}: CSV must include a header row and at least one task row.',
      readError: '{{fileName}}: Could not read this CSV file.',
      rowError: 'Row {{row}}: {{detail}}',
      importError: 'Could not import tasks.',
      partialError:
        '{{message}} Import stopped after {{completed}}/{{total}} batches{{filePart}}. Earlier batches were already saved; reload tasks before importing remaining rows.',
      whileProcessing: ' while processing {{fileName}}',
      result: '{{status}} {{created}} tasks{{skipped}}{{batches}}.',
      partiallyImported: 'Partially imported',
      csvFilesComplete: '{{completed}}/{{total}} CSV files complete.',
      footerUploadHelp: 'Upload one or more CSV files to import tasks.',
      skipped: ', skipped {{count}} rows',
      batchProgress: ' ({{completed}}/{{total}} batches)',
    },
    fileReview: {
      mappingComplete: 'Mapping complete',
      filePosition: 'File {{index}} of {{count}}',
      previous: 'Previous',
      next: 'Next',
    },
    columnMapping: {
      csvSample: 'CSV sample',
      sampleDescription: 'First {{count}} rows from the original file.',
      title: 'Column mapping',
      description: 'Every column must be mapped or explicitly ignored.',
      csvColumn: 'CSV column',
      sample: 'Sample',
      cognoField: 'Cogno field',
      selectField: 'Select field',
      requiredDecision: 'Required decision',
      taskTitleRequired: 'Task title column is required.',
      taskTitleValueRequired: 'At least one row needs a Task title value.',
      singleColumn:
        '{{field}} can only be mapped to one CSV column: {{columns}}.',
    },
    statusMapping: {
      title: 'Status mapping',
      description:
        'Map source values to Cogno statuses, then add tags for Active or Backlog.',
      tag: 'Tag',
      useTag: 'Use tag',
      noTag: 'No tag',
      tagName: 'Tag name',
      empty: 'Map one column to Status to configure source values.',
      selectStatus: 'Select status',
    },
    memberMapping: {
      title: 'Member mapping',
      description: 'Map source assignees and collaborators to Cogno members.',
      doNotAssign: 'Do not assign',
      selectMember: 'Select member',
      empty:
        'Map a column to Assignee or Collaborators to configure source values.',
    },
    preview: {
      title: 'Preview',
      description: 'First {{count}} rows after mapping.',
      columnsUndecided: '{{count}} columns undecided',
      taskTitleRequired: 'Task title required',
      statusesUnmapped: '{{count}} statuses unmapped',
      membersUnmapped: '{{count}} members unmapped',
      ready: 'Ready',
      taskTitle: 'Task title',
      status: 'Status',
      assignee: 'Assignee',
      collaborators: 'Collaborators',
      start: 'Start',
      due: 'Due',
      project: 'Project',
      parentTask: 'Parent Task',
      source: 'Source',
      metadata: 'Metadata',
    },
    fields: {
      taskTitle: {
        label: 'Task title',
        description: 'Main Cogno task title',
      },
      description: {
        label: 'Description',
        description: 'Task body text',
      },
      status: {
        label: 'Status',
        description: 'Editable status mapping',
      },
      assignee: {
        label: 'Assignee',
        description: 'Primary owner from CSV',
      },
      collaborators: {
        label: 'Collaborators',
        description: 'Followers or supporting members',
      },
      dueDate: {
        label: 'Due date',
        description: 'Task due date',
      },
      startDate: {
        label: 'Start date',
        description: 'Task start date',
      },
      project: {
        label: 'Project',
        description: 'Create or link a Cogno project',
      },
      parentTask: {
        label: 'Parent Task',
        description: 'Resolve to a root Cogno parent task',
      },
      source: {
        label: 'Source',
        description: 'External source link',
      },
      metadata: {
        label: 'Metadata',
        description: 'Keep unsupported fields',
      },
      skip: {
        label: 'Do not import',
        description: 'Ignore this column',
      },
    },
  },
  createMenu: {
    button: 'Create',
    task: 'Task',
    project: 'Project',
    meeting: 'Meeting',
    creating: 'Creating...',
    createProject: 'Create Project',
    projectDialogTitle: 'Create Project',
    projectDialogDescription:
      'Name the project and add an optional description before opening it.',
  },
  recall: {
    actions: {
      copy: 'Copy',
      copied: 'Copied',
      edit: 'Edit',
    },
    status: {
      pending: 'Pending',
      botCreated: 'Bot dispatched',
      inCall: 'In call',
      recording: 'Recording',
      callEnded: 'Call ended',
      recordingDone: 'Recording done',
      transcribing: 'Transcribing',
      transcriptReady: 'Transcript ready',
      failed: 'Failed',
      archived: 'Archived',
    },
    notetakerButton: {
      title: 'Send Cogno Notetaker to a meeting',
      ariaLabel: 'Send Cogno Notetaker',
    },
    startDialog: {
      title: 'Send Cogno Notetaker',
      description:
        'Paste a Zoom / Google Meet / Microsoft Teams URL. The bot will join, record, and post the transcript back here.',
      successTitle: 'Notetaker dispatched',
      successDescription:
        'Cogno is on its way. Transcript appears here once the call ends.',
      joiningMessage: 'Cogno Notetaker is joining the meeting...',
      joiningDescription:
        'It can take up to a minute for the bot to appear in the call, depending on the platform.',
      titlePlaceholder: 'Title (optional)',
      urlHttpsError: 'URL must start with https://',
      urlInvalidError: 'Enter a valid URL',
      starting: 'Starting...',
      startNotetaker: 'Start Notetaker',
    },
    stopDialog: {
      title: 'Stop Cogno Notetaker?',
      description:
        'The bot will leave the meeting now. Anything recorded up to this point will still be transcribed.',
      keepRecording: 'Keep recording',
      stopping: 'Stopping...',
      stopNotetaker: 'Stop notetaker',
    },
    page: {
      title: 'Meetings',
      description: 'Review meeting transcripts and recordings.',
      workspaceNotSelected: 'Workspace not selected.',
      list: 'List',
      selectMeeting: 'Select a meeting on the left to view its transcript.',
    },
    list: {
      scheduledMeetings: 'Scheduled meetings',
      scheduledMeetingsDescription:
        'Only meetings linked to your account in this workspace are shown.',
      loadingScheduledMeetings: 'Loading scheduled meetings...',
      loadingMeetings: 'Loading meetings...',
      failedLoadMeetings: 'Failed to load meetings',
      emptyMeetings:
        'No meetings yet. Use the video button in the top bar to send Cogno Notetaker to a Zoom / Google Meet / Microsoft Teams URL.',
      noTitle: '(No title)',
      timeUnavailable: 'Time unavailable',
      moreScheduled: ' (+{{count}} more)',
      recurrence: {
        daily: 'Daily',
        weekly: 'Weekly',
      },
    },
    calendarIntegration: {
      description:
        'Manage Google Calendar connection status. Each member connects their own Google Calendar.',
      yourConnection: 'Your connection',
      connected: 'Connected',
      statusLabel: 'Status: {{status}}',
      lastSync: 'last sync {{date}}',
      disconnect: 'Disconnect',
      waitingAuthorization: 'Waiting for Google authorization...',
      openingGoogle: 'Opening Google...',
      connectCalendar: 'Connect my Google Calendar',
      authorizationHelp:
        'Complete authorization in the popup. Your connection will be reflected automatically.',
      workspaceMembers: 'Workspace members',
      noWorkspaceMembers:
        'No one in this workspace has connected their Google Calendar yet.',
      you: 'You',
      disconnectDialogTitle: 'Disconnect Google Calendar',
      disconnectDialogDescription:
        'Disconnecting will stop automatic sync and auto-join.',
      disconnecting: 'Disconnecting...',
    },
    taskTranscript: {
      toggleLabel: 'Transcript',
      loading: 'Loading transcript...',
      unavailable: 'Transcript not available',
    },
    detail: {
      loadingMeeting: 'Loading meeting...',
      failedLoadMeeting: 'Failed to load meeting',
      untitledMeeting: 'Untitled meeting',
      editableMeetingTitle: 'Editable meeting title',
      meetingTitlePlaceholder: 'Meeting title',
      editMeetingTitle: 'Edit meeting title',
      titleEmptyError: 'Title cannot be empty.',
      titleSaveError: 'Failed to save title.',
      stopNotetaker: 'Stop Notetaker',
      meetingLink: 'Meeting link',
      transcriptTitle: 'Transcript',
      transcriptEmptyError: 'Transcript cannot be empty.',
      transcriptSaveError: 'Failed to save transcript.',
      editableSpeakerName: 'Editable speaker name for {{speaker}}',
      speakerPlaceholder: 'Speaker',
      editableTranscriptText: 'Editable transcript text for {{speaker}}',
      noTranscriptLines: 'No transcript lines available.',
      transcriptProcessing:
        'Transcript will appear here once the bot finishes processing.',
      noTranscript: 'No transcript available for this meeting.',
      languageCode: 'Language: {{code}}',
      summaryTitle: 'Summary',
      summaryGenerated: 'Generated {{date}}',
      summaryEmptyError: 'Summary cannot be empty.',
      summarySaveError: 'Failed to save summary.',
      shortSummary: 'Short summary',
      shortSummaryDescription: 'The main takeaway shown above the bullet list.',
      editableMeetingSummary: 'Editable meeting summary',
      keyPoints: 'Key points',
      keyPointsDescription: 'One line is saved as one bullet item.',
      editableSummaryBullets: 'Editable summary bullets',
    },
    failureCodes: {
      generic: {
        title: 'Bot failed',
        description: 'The notetaker stopped before it could finish recording.',
      },
      unknown: {
        description:
          'The notetaker stopped before it could finish recording. See the raw error below for details.',
      },
      invalidMeetingLink: {
        title: 'Invalid meeting link',
        description: 'Recall could not recognize this URL as a meeting link.',
        suggestion: 'Double-check the URL and start a new notetaker.',
      },
      meetingNotStarted: {
        title: 'Meeting had not started',
        description: 'The bot reached the call before anyone joined.',
        suggestion: 'Start the meeting first, then send the notetaker.',
      },
      meetingNotFound: {
        title: 'Meeting not found',
        description: 'The meeting ID was no longer valid when the bot arrived.',
        suggestion: 'Confirm the meeting is live and resend the notetaker.',
      },
      waitingRoomTimeout: {
        title: 'Stuck in the waiting room',
        description: 'No one admitted the bot before the timeout.',
        suggestion: 'Ask a host to admit Cogno Notetaker next time.',
      },
      waitingRoomAdmitFailed: {
        title: 'Bot was not admitted',
        description: 'The host declined the bot from the waiting room.',
        suggestion: 'Admit Cogno Notetaker when it knocks.',
      },
      nooneJoinedTimeout: {
        title: 'No one joined the call',
        description: 'The bot waited but no participants joined.',
      },
      everyoneLeftTimeout: {
        title: 'Everyone left',
        description:
          'All participants left the call so the bot ended the session.',
      },
      botKickedFromCall: {
        title: 'Bot was removed',
        description: 'A host or co-host removed Cogno Notetaker from the call.',
      },
      recordingPermissionDenied: {
        title: 'Recording was denied',
        description: 'The host did not grant recording permission to the bot.',
        suggestion: 'Ask the host to allow recording from this participant.',
      },
      meetingLocked: {
        title: 'Meeting was locked',
        description: 'The host locked the meeting before the bot could join.',
        suggestion: 'Unlock the meeting briefly, then resend the notetaker.',
      },
      signinRequired: {
        title: 'Sign-in required',
        description: 'The meeting requires participants to be signed in.',
        suggestion: 'Open the meeting to guests, or use a different platform.',
      },
      internalError: {
        title: 'Recall.ai internal error',
        description: 'Something went wrong on Recall.ai while running the bot.',
        suggestion: 'Try sending the notetaker again.',
      },
    },
  },
  workerSetup: {
    title: 'Set up your worker environment',
    subtitle:
      'Claude Code will handle the heavy lifting — just copy the prompt and paste it in.',
    codexTitle: 'Set up Codex for your worker',
    codexSubtitle:
      'Codex will handle the heavy lifting — sign in, then copy the prompt and paste it in.',
    closeAria: 'Close',
    close: 'Close',
    done: 'Done',
    verify: 'Verify',
    verifying: 'Checking…',
    docsLink: 'Claude Code documentation',
    codexDocsLink: 'Codex CLI documentation',
    preflightFailed: 'Preflight failed: {{error}}',
    copyAria: 'Copy {{label}}',
    copiedAria: 'Copied {{label}}',
    installCommandLabel: 'install command',
    loginCommandLabel: 'login command',
    setupPromptLabel: 'setup prompt',
    signInButton: 'Sign in',
    osSwitcherLabel: 'Instructions for',
    osLabels: {
      mac: 'macOS',
      windows: 'Windows',
      linux: 'Linux',
    },
    steps: {
      node: {
        title: 'Install Node.js',
        description: {
          mac: 'Claude Code is a global npm package, so Node.js must be installed first. Download the LTS installer from nodejs.org (or run “brew install node” if you use Homebrew).',
          windows:
            'Claude Code is a global npm package, so Node.js must be installed first. Install it with winget, or download the LTS installer from nodejs.org.',
          linux:
            'Claude Code is a global npm package, so Node.js must be installed first. Install it with your distro’s package manager (apt, dnf, pacman…), or download the LTS installer from nodejs.org.',
          unknown:
            'Claude Code is a global npm package, so Node.js must be installed first. If you don’t already have it, download the LTS installer from nodejs.org.',
        },
        downloadLink: 'Download Node.js (LTS)',
      },
      claude: {
        title: 'Install Claude Code',
        description: {
          mac: 'Once Node.js is installed, install Claude Code globally with npm:',
          windows:
            'Once Node.js is installed, install Claude Code globally with npm:',
          linux:
            'Once Node.js is installed, install Claude Code globally with npm (a global install usually needs sudo on Linux):',
          unknown:
            'Once Node.js is installed, install Claude Code globally with npm:',
        },
      },
      codex: {
        title: 'Install Codex',
        description: {
          mac: 'Install the Codex CLI on this computer:',
          windows: 'Install the Codex CLI on this computer:',
          linux: 'Install the Codex CLI on this computer:',
          unknown: 'Install the Codex CLI on this computer:',
        },
      },
      open: {
        title: 'Open Claude Code',
        description:
          'Open a terminal and run: claude — or launch the Claude Code desktop app if you have it installed.',
      },
      login: {
        claude: {
          title: 'Sign in to Claude Code',
          description:
            'Run Claude Code once and complete sign-in. The embedded terminal can run the login command and open the browser auth flow.',
        },
        codex: {
          title: 'Sign in to Codex',
          description:
            'Run Codex once and complete sign-in. The embedded terminal can run the login command and open the browser auth flow.',
        },
      },
      prompt: {
        title: 'Copy the setup prompt and paste it into Claude Code',
        codexTitle: 'Copy the setup prompt and paste it into Codex',
        description:
          'Copy the prompt below and paste it into Claude Code. It will check for git and gh, install anything missing, and handle authentication.',
        codexDescription:
          'Copy the prompt below and paste it into Codex. It will check for git and gh, install anything missing, and handle authentication.',
      },
      verify: {
        title: "Click Verify below once Claude Code says it's done",
        codexTitle: "Click Verify below once Codex says it's done",
        description:
          "We'll re-run a quick preflight check to confirm everything is ready.",
        codexDescription:
          "We'll re-run a quick preflight check to confirm Codex and the worker prerequisites are ready.",
      },
    },
    tools: {
      notInstalled: 'not installed',
      installed: 'installed',
      installedNotAuthed: 'installed, not authenticated',
      ready: 'ready',
    },
    setupPrompt: `You are helping me set up my development environment for Cogno workers.
Please check and install any missing prerequisites, then authenticate where needed.

Steps to complete:

1. **Confirm you can run shell commands** — the Cogno worker drives you in headless mode, so you must be able to execute bash. If this is a fresh Claude Code install, finish login and accept the one-time "trust this folder / allow commands" prompt. Then run \`echo cogno-bash-ok\` and confirm it prints. If you cannot run it, stop and tell me exactly what permission or trust setting is blocking command execution — the rest of setup depends on this.

2. **Check git** — run \`git --version\`. If not installed:
   - macOS: \`brew install git\` (or install Xcode Command Line Tools)
   - Linux: use your package manager (apt, dnf, pacman, etc.)
   - Windows: \`winget install Git.Git\`

3. **Check GitHub CLI (gh)** — run \`gh --version\`. If not installed:
   - macOS: \`brew install gh\`
   - Linux: follow https://github.com/cli/cli#installation for your distro
   - Windows: \`winget install GitHub.cli\`
   Then run \`gh auth status\` — if not authenticated, run \`gh auth login\` and follow the prompts.

4. **Verify Claude Code auth** — run \`claude auth status\` to confirm you're logged in.
   If not, run \`claude auth login\`.

5. **Final check** — run \`git --version && gh auth status && claude auth status\` and confirm all pass.

Please work through each step, installing anything missing and handling auth flows as needed.
When everything is green, tell me "Setup complete — you can now click Verify in the Cogno app."`,
    codexSetupPrompt: `You are helping me set up my development environment for Cogno workers.
Please check and install any missing prerequisites, then authenticate where needed.

Steps to complete:

1. **Confirm you can run shell commands** — the Cogno worker drives you in headless mode, so you must be able to execute shell commands. If this is a fresh Codex install, finish login and accept any one-time trust or command execution prompts. Then run \`echo cogno-shell-ok\` and confirm it prints. If you cannot run it, stop and tell me exactly what permission or trust setting is blocking command execution — the rest of setup depends on this.

2. **Check git** — run \`git --version\`. If not installed:
   - macOS: \`brew install git\` (or install Xcode Command Line Tools)
   - Linux: use your package manager (apt, dnf, pacman, etc.)
   - Windows: \`winget install Git.Git\`

3. **Check GitHub CLI (gh)** — run \`gh --version\`. If not installed:
   - macOS: \`brew install gh\`
   - Linux: follow https://github.com/cli/cli#installation for your distro
   - Windows: \`winget install GitHub.cli\`
   Then run \`gh auth status\` — if not authenticated, run \`gh auth login\` and follow the prompts.

4. **Verify Codex auth** — run \`codex login status\` to confirm you're logged in.
   If not, run \`codex login\`.

5. **Final check** — run \`git --version && gh auth status && codex login status\` and confirm all pass.

Please work through each step, installing anything missing and handling auth flows as needed.
When everything is green, tell me "Setup complete — you can now click Verify in the Cogno app."`,
  },
} as const;

type WidenMessages<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Record<string, unknown>
      ? WidenMessages<T[K]>
      : never;
};

export type Messages = WidenMessages<typeof en>;
