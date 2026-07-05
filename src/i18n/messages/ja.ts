import type { Messages } from './en';

export const ja = {
  common: {
    loading: '読み込み中...',
    save: '保存',
    saving: '保存中...',
    cancel: 'キャンセル',
    name: '名前',
    email: 'メールアドレス',
    password: 'パスワード',
    or: 'または',
    upload: 'アップロード',
    processing: '処理中...',
    generate: '生成',
    generating: '生成中...',
    remove: '削除',
    removing: '削除中...',
    delete: '削除',
    deleting: '削除中...',
    goBack: '戻る',
    back: '戻る',
    rename: '名前を変更',
    close: '閉じる',
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
    backToApp: 'アプリに戻る',
    account: 'Account',
    yourWorker: 'Your Worker',
    integrations: 'Integrations',
    more: 'その他',
    create: '作成',
    newTask: 'タスクを作成',
    newMeeting: '会議を作成',
    newProject: 'プロジェクトを作成',
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
        title: '連携済みページ',
        changePages: 'ページを変更',
        opening: '開いています...',
        loading: '読み込み中...',
        loadError: 'Notion ページを読み込めませんでした。',
        empty: '連携済みページはありません。',
        truncated: '最初の {{count}} 件の連携対象を表示しています。',
        lastEdited: '最終更新 {{date}}',
        openInNotion: 'Notion で {{title}} を開く',
        objectTypes: {
          page: 'ページ',
          database: 'データベース',
          dataSource: 'データソース',
        },
      },
      exportImport: {
        title: 'エクスポート取り込み',
        noFile: 'エクスポート未選択',
        helper: 'Notion の Markdown & CSV export ZIP を使います。',
        chooseZip: 'ZIP を選択',
        previewing: 'Preview 中...',
        reset: 'リセット',
        previewRows: 'Preview 行',
        exportRows: 'Export 行',
        mapping: 'Mapping',
        aiMapping: 'AI',
        heuristicMapping: '構造推定',
        mappedFields: 'Mapping 済み field',
        importTasks: 'Task を import',
        importing: 'Import 中...',
        importedResult:
          '{{count}} 件の Task を import しました。{{skipped}} 行を skip しました。',
      },
    },
  },
  auth: {
    signInWithGoogle: 'Google でサインイン',
    signInWithApple: 'Apple でサインイン',
    signUpWithGoogle: 'Google で登録',
    signUpWithApple: 'Apple で登録',
    signIn: 'サインイン',
    signingIn: 'サインイン中...',
    createAccount: 'アカウントを作成',
    creatingAccount: 'アカウント作成中...',
    noAccountPrefix: 'アカウントをお持ちでない場合',
    alreadyHaveAccountPrefix: 'すでにアカウントをお持ちの場合',
    forgotPasswordPrefix: 'パスワードを忘れた場合は',
    here: 'こちら',
    passwordUpdated:
      'パスワードを更新しました。新しいパスワードでサインインしてください。',
    hidePassword: 'パスワードを隠す',
    showPassword: 'パスワードを表示',
    verifyEmailTitle: 'メールアドレスを確認してください',
    verifyEmailMessage:
      '次の宛先に送信したリンクからメールアドレスを確認してください:',
    resendVerificationEmail: '確認メールを再送',
    questionsEmailPrefix: '質問がある場合はメールでお問い合わせください:',
    thanks: 'よろしくお願いいたします。',
    cognoTeam: 'Cogno Team',
    legalConsentError:
      'Terms of Service に同意し、Privacy Policy を確認してください。',
    legal: {
      agreePrefix: '',
      terms: 'Terms of Service',
      andAcknowledge: 'に同意し、',
      privacy: 'Privacy Policy',
      socialPrefix: 'Google または Apple で続行すると、',
    },
    forgot: {
      title: 'パスワードをリセット',
      description:
        'メールアドレスを入力すると、パスワードリセット用のリンクを送信します。',
      checkEmailTitle: 'メールを確認してください',
      checkEmailDescription: 'パスワードリセット用のリンクを送信しました:',
      sendResetLink: 'リセットリンクを送信',
      sending: '送信中...',
      backToLogin: 'ログインに戻る',
    },
    reset: {
      title: '新しいパスワードを設定',
      description: '新しいパスワードを入力してください。',
      newPassword: '新しいパスワード',
      confirmPassword: 'パスワードを確認',
      passwordsDoNotMatch: 'パスワードが一致しません',
      passwordTooShort: 'パスワードは6文字以上にしてください',
      updatePassword: 'パスワードを更新',
      updatingPassword: 'パスワードを更新中...',
    },
    error: {
      fallback: '認証中にエラーが発生しました',
      verificationFailed: '確認に失敗しました',
      tryLoggingIn: 'ログインを試す',
      signUpAgain: 'もう一度登録する',
    },
  },
  settings: {
    pageDescription:
      'プロフィール、表示設定、ショートカット、アカウント管理を設定します。',
    loading: '読み込み中...',
    signInRequired: '設定を管理するにはサインインしてください。',
    avatarAlt: 'ユーザー avatar',
    imageOpenError:
      '選択した画像を開けませんでした。別のファイルを試してください。',
    nameNoChanges: '保存する変更はありません。',
    nameUpdated: '名前を更新しました。',
    nameUpdateError: '名前の更新中にエラーが発生しました。',
    avatarUpdated: 'Avatar を更新しました。',
    avatarSaveError: 'Avatar の保存中にエラーが発生しました。',
    avatarRemoved: 'Avatar を削除しました。',
    avatarRemoveError:
      'Avatar を削除できませんでした。もう一度試してください。',
    avatarGenerated: 'Avatar を生成しました。',
    avatarGenerateError:
      'Avatar を生成できませんでした。もう一度試してください。',
    photo: '写真',
    cropAvatar: 'Avatar を切り抜き',
    cropAvatarDescription:
      '顔が中央に来るように切り抜きを調整します。正方形の画像として保存されます。',
    noImageSelected: '画像が選択されていません。',
    zoom: 'Zoom',
    saveAvatar: 'Avatar を保存',
    name: '名前',
    visibleToCollaborators: 'Collaborator に表示されます。',
    displayName: '表示名',
    displayNamePlaceholder: '表示名を入力',
    accountsDescription:
      'アカウントの切り替え、アカウント追加、ログアウトを管理します。',
    theme: 'テーマ',
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: '言語',
    languageDescription: '説明文、メッセージ、設定画面の表示言語を選択します。',
    languageSaved: '言語を更新しました。',
    languageSaveError: '言語を更新できませんでした。もう一度試してください。',
    languageOptions: {
      en: 'English',
      ja: 'Japanese',
    },
    keyboardShortcuts: 'Keyboard Shortcuts',
    keyboardDescription: '⌘ shortcuts をカスタマイズします',
    toggleSidebar: 'Sidebar を切り替え',
    toggleTaskPanel: 'Task panel を切り替え',
    shortcutDuplicate: '"{{key}}" は別の shortcut に割り当て済みです。',
    shortcutSaveError:
      'Shortcut を保存できませんでした。もう一度試してください。',
    shortcutResetError:
      'Shortcut をリセットできませんでした。もう一度試してください。',
    resetToDefaults: 'デフォルトに戻す',
    navigation: 'Navigation',
    navigationDescription: '表示する画面を切り替えます',
    goToStudio: 'Studio へ移動',
    goToWorkspace: 'Workspace へ移動',
    deleteAccount: 'アカウント削除',
    deleteAccountAction: 'アカウントを削除',
    deleteAccountPermanent: '元に戻せない操作です。',
    deleteAccountTitle: 'アカウントを削除',
    deleteAccountConfirm: 'この操作は元に戻せません。',
    deleteAccountWill: '実行される内容:',
    deleteAccountNotesTasks: 'すべての Note と Task を削除',
    deleteAccountWorkspaces: 'すべての Workspace から退出',
    deleteAccountProfile: 'プロフィール情報を削除',
    deleteAccountPermanentWarning: 'この操作は永続的です。',
    deleteAccountConfirmAction: 'アカウントを削除する',
  },
  accountMenu: {
    openUserMenu: 'ユーザーメニューを開く',
    accounts: 'アカウント',
    loadingAccounts: 'アカウントを読み込み中',
    noSavedAccounts: '保存済みアカウントはありません',
    addAccount: 'アカウントを追加',
    switchAccount: 'アカウントを切り替え',
    addGoogleAccount: 'Google アカウントを追加',
    addAppleAccount: 'Apple アカウントを追加',
    currentAccount: '現在',
    adding: '追加中',
    switching: '切り替え中',
    signOut: 'ログアウト',
    signingOut: 'ログアウト中...',
    loadAccountsError: 'アカウントを読み込めませんでした',
    switchAccountError: 'アカウントを切り替えられませんでした',
    addAccountError: 'アカウントを追加できませんでした',
  },
  tasks: {
    pageTitle: 'Tasks',
    pageDescription: 'Workspace 内の作業を作成、絞り込み、移動します。',
    failedLoad: 'Tasks を読み込めませんでした',
    retry: '再試行',
    filter: '絞り込み',
    saveView: 'View を保存',
    switchView: 'Task view を切り替え（{{view}}）',
    newTask: 'New Task',
    createDialog: {
      create: '作成',
      creating: '作成中...',
    },
    search: '検索',
    searchByName: 'Task title または番号で検索',
    searchByNamePlaceholder: 'Task title または #123 で検索...',
    clearNameSearch: '検索をクリア',
    searchMembersPlaceholder: 'Member を検索...',
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
      ariaLabel: 'Board を status で絞り込み',
      label: 'Status',
      count: '{{count}} status',
    },
    descriptionHistory: {
      title: '説明の履歴',
      savedVersions: '{{count}} 件の保存済みバージョン',
      recoverPreviousEdits: '過去の編集を復元',
      closeAria: '説明の履歴を閉じる',
      emptyTitle: 'バージョンはまだありません',
      emptyBody:
        'AI または人間の編集で説明が変わるとバージョンが表示されます。',
      emptyDescription: '空の説明',
      restoreConfirm: 'このバージョンを復元しますか？',
      restore: '復元',
      restoredFrom: 'v{{version}} から復元',
      loadHistory: '説明の履歴を読み込む',
      loadingHistory: '説明の履歴を読み込み中',
      previousVersion: '前のバージョン',
      nextVersion: '次のバージョン',
      actorAi: 'AI',
      actorHuman: '人間',
      unknownAuthor: '不明',
      memberFallback: 'メンバー #{{id}}',
    },
    mermaid: {
      showDiagram: '図を表示',
      showCode: 'コードを表示',
      expandDiagram: '図を拡大',
      expandedDiagramTitle: '拡大した Mermaid 図',
      closeExpandedDiagram: '拡大した Mermaid 図を閉じる',
      invalidSyntax: 'Mermaid 構文が無効です',
    },
    tags: {
      label: 'Tags',
      editAria: 'Task tags を編集',
      searchPlaceholder: 'Tag を検索または作成...',
      empty: 'Tag が見つかりません',
      noTag: 'Tag なし',
      loading: 'Tags を読み込み中...',
      create: '"{{name}}" を作成',
      createNew: 'Tag を作成',
      add: 'Tag を追加',
      removeAria: '{{name}} tag を削除',
      namePlaceholder: 'Tag 名',
      editTagAria: '{{name}} tag を編集',
      deleteTagAria: '{{name}} tag を削除',
      cancelEditAria: 'Tag 編集をキャンセル',
      saveEditAria: 'Tag 編集を保存',
      assignError:
        'Task は作成されましたが、tag を付与できませんでした。Tag を調整して再試行してください。',
      retryAssign: 'Tag 付与を再試行',
      finishWithoutTags: 'Tag なしで完了',
    },
  },
  comments: {
    loading: '読み込み中...',
    empty: 'Comment はまだありません。',
    writePlaceholder: 'Comment を入力...',
    replyPlaceholder: '返信...',
    send: '送信',
    addAttachment: '添付を追加',
    attachFile: 'ファイルを添付',
    removeAttachment: '{{filename}} を削除',
    attachmentUploading: 'アップロード中...',
    attachmentUploadFailed: '失敗',
    attachmentUploadError: '添付ファイルをアップロードできませんでした。',
    attachmentLimit: '添付できるファイルは最大 {{count}} 件です。',
    downloadAttachment: '{{filename}} をダウンロード',
    attachmentDownloadError: '添付ファイルをダウンロードできませんでした。',
    attachmentPreviewUnavailable: 'プレビューできません',
    jumpToUnread: '未読へ移動',
  },
  inbox: {
    pageDescription: '対応が必要な mentions と replies です。',
    untitledTask: 'Untitled Task',
    tabs: {
      all: 'All',
      mentions: 'Mentions',
      replies: 'Replies',
    },
    groups: {
      today: '今日',
      yesterday: '昨日',
      thisWeek: '今週',
      earlier: 'それ以前',
    },
    actions: {
      markAllRead: 'すべて既読にする',
      showRead: '既読を表示',
      showingAll: '既読を非表示',
      loadMore: 'さらに読み込む',
    },
    error: {
      failedLoad: 'Inbox を読み込めませんでした',
      unknown: '不明なエラー',
    },
    empty: {
      allCaughtUp: 'すべて確認済みです',
      noNotifications: '通知はまだありません',
      noMentions: 'Mentions はまだありません',
      noReplies: 'Replies はまだありません',
      showReadNotifications: '既読の通知を表示',
      allDescription:
        '誰かがあなたを mention したり、あなたの Comment に reply すると、ここに表示されます。',
      mentionDescription:
        '誰かが Task description または Comment であなたを @mention すると、ここに表示されます。',
      replyDescription:
        '誰かがあなたの Comment に reply すると、ここに表示されます。',
    },
    item: {
      mentionedYou: 'あなたを mention しました',
      mentionedYouInDescription: 'description であなたを mention しました',
      repliedToYourComment: 'あなたの Comment に reply しました',
      unknownActor: 'Unknown',
      unreadSuffix: '（未読）',
      ariaLabel: '{{actor}} が {{task}} で {{action}}{{unread}}',
      closeReply: 'Reply を閉じる',
      reply: 'Reply',
      replyPlaceholder: 'Reply を入力...',
      memberFallback: 'Member #{{id}}',
    },
  },
  projectsPage: {
    description: '成果、日付、進捗ごとに Tasks をまとめます。',
    newProject: 'Project を作成',
    newProjectName: 'New Project',
    namePlaceholder: 'project-name',
    createHelper:
      'プロジェクトは成果・日付・進捗ごとにタスクをまとめます。短く分かりやすい名前を使いましょう。',
    emptyTitle: 'Project はまだありません',
    emptyDescription: 'Tasks を整理する Project を作成します',
    taskCount: '{{count}} 件の {{label}}',
    taskSingular: 'Task',
    taskPlural: 'Tasks',
    detail: {
      notFound: 'Project が見つかりません',
      projectNamePlaceholder: 'Project name',
      start: '開始',
      target: '目標',
      setDate: '日付を設定',
      descriptionPlaceholder: '説明を追加...',
      progress: '進捗',
      progressText: '{{completed}} / {{total}} Tasks 完了',
      addTask: 'Task を追加',
      noTasks: 'この Project に Task はありません',
      deleteProject: 'Project を削除',
      deleteTitle: 'Project を削除',
      deleteDescription:
        'この Project には {{count}} 件の {{taskLabel}} があります。削除すると元に戻せません。',
    },
  },
  workspaceSettings: {
    invalidWorkspace: 'Workspace が無効です。',
    failedLoad: 'Workspace settings を読み込めませんでした。',
    generalDescription:
      'Workspace の基本情報、Task import、Workspace 全体の管理項目を設定します。',
    loading: '読み込み中...',
    icon: 'Icon',
    workspaceIconAlt: 'Workspace icon',
    imageOpenError:
      '選択した画像を開けませんでした。別のファイルを試してください。',
    uploadImage: '画像をアップロード',
    workspaceName: 'Workspace Name',
    workspaceNamePlaceholder: 'Workspace name を入力',
    workspaceNameRequired: 'Workspace name は必須です。',
    workspaceNameUpdated: 'Workspace name を更新しました。',
    workspaceNameUpdateError:
      'Workspace name を更新できませんでした。もう一度試してください。',
    promptLanguage: 'エージェントプロンプト言語',
    promptLanguageDescription:
      'Workspace 単位で Cogno のエージェント指示とコメントの言語を選択します。',
    promptLanguageOptions: {
      en: '英語',
      ja: '日本語',
    },
    noChanges: '保存する変更はありません。',
    iconUpdated: 'Workspace icon を更新しました。',
    iconUpdateError:
      'Workspace icon を更新できませんでした。もう一度試してください。',
    iconGenerated: 'Workspace icon を生成しました。',
    iconGenerateError:
      'Workspace icon を生成できませんでした。もう一度試してください。',
    iconRemoved: 'Workspace icon を削除しました。',
    iconRemoveError:
      'Workspace icon を削除できませんでした。もう一度試してください。',
    cropIconTitle: 'Workspace icon を調整',
    cropIconDescription:
      '画像の重要な部分が中央に来るよう調整します。最終的な icon は正方形になります。',
    saveIcon: 'Icon を保存',
    taskImport: {
      title: 'Task import',
      docs: 'Docs',
      dropTitle: 'Task CSV をドラッグ＆ドロップ',
      dropDescription:
        'このエリアにファイルをドロップしてください。Task を作成する前に、Cogno が column mapping を開きます。',
      chooseCsv: 'Task CSV を選択',
      supported:
        'Linear、Notion、GitHub、Asana、Jira の CSV export に対応しています。',
    },
    demo: {
      title: 'Demo',
      reset: 'Demo をリセット',
      resetting: 'リセット中...',
      description:
        'すべての Task を「まだ button が押されていない」状態に戻します。',
      success:
        'リセットしました: action {{actions}} 件を再有効化、reply {{replies}} 件を削除、dispatch 済み job {{jobs}} 件を削除、Task 変更 {{tasks}} 件を戻しました。',
      failed: 'Demo workspace をリセットできませんでした。',
      dialogTitle: 'Demo workspace をリセット',
      dialogDescription:
        'この Workspace を「まだ button が押されていない」状態に戻します。',
      thisWill: '実行される内容:',
      rearmButtons: 'すべての Block Kit button を再有効化',
      removeReplies: 'それらの button が作成した agent reply comments を削除',
      clearWork: 'dispatch 済み agent work をキャンセルして削除',
      revertTasks: 'button による Task status / assignee 変更を戻す',
      safeRepeatedly:
        '繰り返し実行できます。この demo workspace だけに影響します。',
    },
    danger: {
      title: 'Danger Zone',
      deleteWorkspace: 'Workspace を削除',
      permanent: '元に戻せない操作です。',
      deleting: '削除中...',
      action: 'Workspace を削除',
      dialogTitle: 'Workspace を削除',
      dialogDescription: 'この操作は元に戻せません。',
      thisWill: '実行される内容:',
      deleteNotes: 'すべての Note と chat history を削除',
      removeMembers: 'この Workspace からすべての member を削除',
      deleteData: 'すべての Workspace data を削除',
      typeToConfirm: '確認のため {{name}} と入力してください。',
      renameFirst: '（先に名前を変更してください）',
      workspaceNamePlaceholder: 'Workspace name',
      missingName: '削除前に Workspace name を設定してください。',
      mismatch: 'Workspace title が一致しません。',
      deleteError: 'Workspace を削除できませんでした。もう一度試してください。',
      confirmAction: 'Workspace を削除する',
    },
    members: {
      description: 'Workspace members を招待・確認します。',
      invite: '招待',
      edit: '編集',
      done: '完了',
      failedLoad: 'Members を読み込めませんでした',
      empty: 'この Workspace に member はいません',
      joined: '{{date}} に参加',
      editProfile: 'Member profile を編集',
      editProfileFor: '{{name}} の member profile を編集',
      removeConfirm: 'この member を削除しますか？',
      makeOwner: 'Owner にする',
      makeMember: 'Member にする',
    },
    apiKeys: {
      description:
        'この Workspace の CLI / worker tokens を作成・取り消します。',
      create: '作成',
      failedLoad: 'API keys を読み込めませんでした',
      helpPrefix:
        'API keys は JWT refresh なしで worker daemons を認証します。',
      helpSuffix: 'で CLI を設定します。',
      empty:
        'API keys はまだありません。worker daemons を認証する key を作成してください。',
      unnamed: 'Unnamed key',
      created: '{{date}} に作成',
      lastUsed: '最終使用 {{date}}',
      revokeConfirm:
        'この key を取り消しますか？使用中の Workers はすぐに access を失います。',
      revoke: '取り消す',
      createdTitle: 'API key を作成しました',
      createdDescription:
        'この key を今コピーしてください。後から再表示できません。',
      useItWith: '使用コマンド:',
      createTitle: 'API key を作成',
      nameOptional: '名前（任意）',
      namePlaceholder: '例: My laptop worker',
      creating: '作成中...',
    },
    memory: {
      description: 'AI が wake するたびに参照する Workspace summary です。',
      failedLoad: '読み込めませんでした: {{message}}',
      failedSave: '保存できませんでした: {{message}}',
      saved: '保存しました。',
      revert: '元に戻す',
      preview: 'Preview',
      chars: '{{count}} 文字',
      detail:
        'AI が wake するたびに読む Workspace 全体の summary です。Markdown として編集できます。',
      lastUpdated: '最終更新: {{date}}',
      loading: '読み込み中...',
      emptyPrefix: 'Memory は空です。',
      emptySuffix: 'をクリックして内容を追加してください。',
      placeholder: '### Workspace Status Report ...',
    },
    workers: {
      description: 'Worker の稼働状態と最近の agent jobs を監視します。',
      tabs: {
        workerHub: 'Worker Hub',
        monitor: 'Monitor',
        machines: 'Machines',
        history: 'History',
      },
      failedLoad: 'Workers を読み込めませんでした',
      onlineSummary: '{{online}} online · {{total}} total',
      refresh: '更新',
      helpPrefix: 'CLI workers は',
      helpSuffix:
        'の実行中にここへ登録されます。稼働状態は各 worker の heartbeat から判断します。2 分以内に報告が止まると stale、その後 offline と表示されます。この view は 10 秒ごとに自動更新されます。',
      failedWorkHistory: 'Work history を読み込めませんでした',
      agentWork: 'Agent work',
      itemCount: '{{count}} {{label}}',
      itemSingular: 'item',
      itemPlural: 'items',
      recentWork:
        'Workers に dispatch された直近 50 件の work items です。pending、running、completed、failed を表示します。',
      emptyWorkers:
        'Workers はまだ登録されていません。{{command}} で CLI を開始すると登録されます。',
      emptyWorkersPrefix: 'Workers はまだ登録されていません。',
      emptyWorkersSuffix: 'で CLI を開始すると登録されます。',
      unknownMachine: 'Unknown machine',
      heartbeat: 'Heartbeat {{time}}',
      currentWork: '{{status}} · work #{{id}}',
      noCurrentWork: '現在の work はありません',
      hardware: {
        cores: '{{count}} コア',
        ram: 'メモリ {{size}}',
        disk: '空き {{free}} / {{total}}',
      },
      machines: {
        empty: 'マシンはまだありません。',
        summary: '{{machines}} マシン · {{workers}} worker オンライン',
        online: 'オンライン',
        offline: 'オフライン',
        workerCount: '{{online}}/{{total}} worker',
        noHardware: 'ハードウェア情報は未報告です',
        environments: '実行環境 ({{count}})',
        registered: '登録済み',
        adhoc: '未登録',
        noWorker: 'worker なし',
      },
      emptyWork: 'Agent work はまだありません。',
      viewPr: 'PR を表示',
      moreActions: 'その他の操作',
      viewDetails: '詳細を表示',
      cancelTask: 'タスクをキャンセル',
      cancelling: 'キャンセル中…',
      cancelFailed: 'タスクのキャンセルに失敗しました',
      removeWorker: 'Worker を削除',
      starting: '起動中...',
      startingWorker: 'Worker を起動中...',
      taskCounts: {
        claimable: '{{count}} 処理可能',
        completed: '{{count}} 完了',
      },
      executorSelector: {
        selectLabel: 'Executor model を選択',
        stopBeforeChanging:
          'Default model を変更する前に workers を停止してください',
        loadingModels: 'Models を読み込み中…',
        retry: '再試行',
        unavailable: '利用不可',
      },
      visualCapture: {
        label: '画面キャプチャ',
        optional: '任意',
        setupTitle: '任意: 画面プレビューを有効にする',
        setupDescription:
          'このマシンに Playwright と Chromium ブラウザをインストールすると、Spec と実装の実行時に UI スクリーンショットをタスクの説明に添付できます。Chromium ブラウザ用ファイルとして約 300 MB のディスク容量が必要です。Linux ではシステムパッケージもインストールされる場合があります。',
        installCommandLabel: '画面プレビューのインストールコマンド',
        installButton: '画面プレビューをインストール',
        workerNeedsPlaywright:
          'Worker は準備済み · 画面プレビューには Playwright が必要です',
        ready: '準備完了',
        notInstalled: '未インストール',
      },
      capabilities: {
        title: 'Add-ons',
        description:
          'このコンピューターで使う AI tool を選び、必要に応じて補助機能を有効にします。',
        summary:
          'AI tool {{tools}} 件準備完了 · 補助機能 {{addOns}} 件準備完了',
        summaryReadinessUnknown:
          'AI tool の準備状態を確認できません · 補助機能 {{addOns}} 件準備完了',
        loading: 'Worker add-ons を確認中...',
        desktopOnly:
          'Worker add-ons は Cogno desktop app からのみ管理できます。',
        loadError: 'Worker add-ons を確認できませんでした。',
        aiToolModelMissing: 'この AI tool で使える model がありません。',
        aiToolModel: 'Model: {{model}}',
        aiToolChooser: {
          title: 'AI tool を選択',
          description:
            'Worker で使う AI tool を選びます。このコンピューターで準備できていない tool は、Worker を起動する前にセットアップを完了してください。',
          selected: '選択中',
          reasonFallback: '準備未完了',
          modelLabel: 'Default model: {{model}}',
          chooseAndSetUp: '選んでセットアップへ',
          continue: '続ける',
          dismiss: 'あとで',
        },
        sections: {
          aiTool: {
            title: 'AI tool',
            description:
              'このコンピューターで Cogno が作業を実行するときに使う AI tool を選びます。',
          },
          optionalHelpers: {
            title: 'Optional helpers',
            description:
              'Worker でできることを増やす補助機能です。起動には必須ではありません。',
          },
        },
        status: {
          ready: '準備完了',
          needsSetup: 'セットアップが必要',
          selected: '選択中',
        },
        actions: {
          refresh: '更新',
          retry: '再試行',
          setUp: 'セットアップ',
          install: 'インストール',
          reinstall: '再インストール',
          signIn: 'サインイン',
          check: '確認',
          manage: '管理',
          useThis: 'これを使う',
          verify: '確認',
          copyCommand: 'コマンドをコピー',
        },
        aiTools: {
          empty: 'この WOD version では利用できる AI tool がありません。',
          setupTitle: '{{tool}} をセットアップ',
          readyTitle: '{{tool}} は準備完了です',
          setupSubtitle:
            'このコンピューターで手順を完了したあと、状態を確認します。',
          verifyTitle: '確認',
          verifyDescription:
            'このコンピューターを再確認し、Worker の状態を更新します。',
          claude: {
            description:
              'このコンピューター上の Claude Code で Worker task を実行します。',
            installTitle: 'Claude Code をインストール',
            installDescription:
              'Claude Code は npm からインストールします。npm がない場合は先に Node.js をインストールしてください。',
            signInTitle: 'Claude Code にサインイン',
            signInDescription:
              'ログインコマンドを実行し、ブラウザでのサインインを完了します。',
            docsLabel: 'Claude Code documentation',
          },
          codex: {
            description:
              'このコンピューター上の Codex で Worker task を実行します。',
            installTitle: 'Codex をインストール',
            installDescription:
              'Codex CLI をインストールし、codex コマンドが PATH から見える状態にします。',
            signInTitle: 'Codex にサインイン',
            signInDescription:
              'Codex を一度開き、表示されるサインイン手順を完了します。',
            docsLabel: 'Codex CLI documentation',
          },
        },
        visualCapture: {
          title: 'Visual Capture',
          category: 'Visual previews',
          description:
            '実装やレビューのタスクにスクリーンショットを添付します。',
          terminalTitle: 'Visual Capture をインストール中',
        },
        githubCli: {
          title: 'GitHub CLI',
          category: 'Pull requests',
          description: 'PR 作成、check 確認、review thread 対応に使います。',
          notInstalled: '未インストール',
          authTerminalTitle: 'GitHub CLI にサインイン中',
          statusTerminalTitle: 'GitHub CLI の状態を確認中',
        },
      },
      background: {
        title: 'Background',
        desktopOnly:
          'Worker background settings は Cogno desktop app からのみ管理できます。',
        keepRunning: 'Cogno をバックグラウンドで動かす',
        keepRunningDescription: 'このデバイスが復帰したら作業を再開します。',
        sleepBehavior: '非アクティブ時',
        recommended: '推奨',
        updateAvailable:
          '新しい worker engine が利用可能です。自動的に適用されます。',
        needHelp: 'お困りですか？',
        stopActivity: 'バックグラウンド動作を停止',
        stoppingActivity: '停止中...',
        stopDialogTitle: 'バックグラウンド動作を停止しますか？',
        stopDialogDescription:
          'このデバイスで Cogno のバックグラウンド動作を停止します。実行中のローカル作業は中断される可能性があります。後からこのページで再度オンにできます。',
        confirmStopActivity: 'バックグラウンド動作を停止',
        stopFailed:
          'バックグラウンド動作を停止できませんでした。もう一度試してください。',
        sleepModes: {
          sleepResume: '通常どおりスリープ',
          keepAwakeActive: '作業中はスリープしない',
          alwaysAwake: '常にスリープしない',
        },
      },
      detail: {
        back: '履歴に戻る',
        clearSelection: '選択を解除',
        emptyTitle: 'Work item を選択',
        emptyDescription:
          '履歴から item を選ぶと、状態、オーナー、ルーティング、実行時間、ログを確認できます。',
        loading: 'Work item を読み込み中...',
        notFound: 'この work item は利用できなくなりました。',
        intent: 'Intent',
        type: 'タイプ',
        worker: 'Worker',
        owner: 'オーナー',
        task: 'タスク',
        routingReason: 'ルーティング理由',
        created: '作成',
        claimed: 'Claimed',
        started: '開始',
        completed: '完了',
        duration: '所要時間',
        error: 'エラー',
        summary: '概要',
        log: 'アクティビティログ',
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
      description: 'この Workspace の最近の Task changes です。',
      loading: 'Activity を読み込み中...',
      empty: 'Activity はまだありません',
      system: 'System',
    },
  },
  taskImport: {
    dropzone: {
      title: 'Task CSV をドラッグ＆ドロップ',
      description:
        'このエリアに 1 つ以上の CSV file をドロップするか、computer から選択してください。',
      chooseCsv: 'Task CSV を選択',
      uploadedFiles: 'アップロード済み CSV files',
      uploadedDescription: 'File number を選択して mapping を確認します。',
      fileStats: '{{rows}} rows, {{columns}} columns{{issues}}{{readiness}}',
      issueSingular: 'issue',
      issuePlural: 'issues',
      needsMapping: 'mapping が必要',
      removeFile: '{{fileName}} を削除',
    },
    dialog: {
      title: 'Tasks を import',
      description:
        'CSV files をアップロードし、各 column と Cogno field の mapping を確認してから、生成される Task preview を確認します。',
      uploadFirst: '先に 1 つ以上の CSV file をアップロードしてください。',
      completeMappings:
        'Import 前にすべての CSV の mapping complete をオンにしてください。',
      importingProgress: 'Import 中 {{completed}}/{{total}}',
      importing: 'Import 中...',
      imported: 'Imported',
      importCsv: '{{count}} CSV を import',
      import: 'Import',
      csvShapeError:
        '{{fileName}}: CSV には header row と 1 件以上の Task row が必要です。',
      readError: '{{fileName}}: この CSV file を読み込めませんでした。',
      rowError: 'Row {{row}}: {{detail}}',
      importError: 'Tasks を import できませんでした。',
      partialError:
        '{{message}} {{completed}}/{{total}} batches の時点で import を停止しました{{filePart}}。それ以前の batches は保存済みです。残りの rows を import する前に Tasks を再読み込みしてください。',
      whileProcessing: '（{{fileName}} の処理中）',
      result: '{{status}}: {{created}} Tasks{{skipped}}{{batches}}。',
      partiallyImported: '一部 import 済み',
      csvFilesComplete: '{{completed}}/{{total}} CSV files complete.',
      footerUploadHelp:
        'Tasks を import するには CSV files をアップロードしてください。',
      skipped: '、{{count}} rows skipped',
      batchProgress: '（{{completed}}/{{total}} batches）',
    },
    fileReview: {
      mappingComplete: 'Mapping complete',
      filePosition: 'File {{index}} / {{count}}',
      previous: '前へ',
      next: '次へ',
    },
    columnMapping: {
      csvSample: 'CSV sample',
      sampleDescription: '元 file の先頭 {{count}} rows です。',
      title: 'Column mapping',
      description:
        'すべての column を mapping するか、明示的に無視してください。',
      csvColumn: 'CSV column',
      sample: 'Sample',
      cognoField: 'Cogno field',
      selectField: 'Field を選択',
      requiredDecision: '選択が必要です',
      taskTitleRequired: 'Task title column は必須です。',
      taskTitleValueRequired:
        '少なくとも 1 row に Task title value が必要です。',
      singleColumn:
        '{{field}} は 1 つの CSV column にだけ mapping できます: {{columns}}。',
    },
    statusMapping: {
      title: 'Status mapping',
      description:
        'Source values を Cogno statuses に mapping し、Active または Backlog に tag を追加します。',
      tag: 'Tag',
      useTag: 'Tag を使う',
      noTag: 'Tag なし',
      tagName: 'Tag name',
      empty:
        'Source values を設定するには、1 つの column を Status に mapping してください。',
      selectStatus: 'Status を選択',
    },
    memberMapping: {
      title: 'Member mapping',
      description:
        'Source assignees / collaborators を Cogno members に mapping します。',
      doNotAssign: 'Assign しない',
      selectMember: 'Member を選択',
      empty:
        'Source values を設定するには、column を Assignee または Collaborators に mapping してください。',
    },
    preview: {
      title: 'Preview',
      description: 'Mapping 後の先頭 {{count}} rows です。',
      columnsUndecided: '{{count}} columns 未選択',
      taskTitleRequired: 'Task title が必要です',
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
        description: 'Cogno の main Task title',
      },
      description: {
        label: 'Description',
        description: 'Task body text',
      },
      status: {
        label: 'Status',
        description: '編集可能な status mapping',
      },
      assignee: {
        label: 'Assignee',
        description: 'CSV 上の primary owner',
      },
      collaborators: {
        label: 'Collaborators',
        description: 'Followers または supporting members',
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
        description: 'Cogno project を作成または紐づけ',
      },
      parentTask: {
        label: 'Parent Task',
        description: 'Root Cogno parent task に解決',
      },
      source: {
        label: 'Source',
        description: 'External source link',
      },
      metadata: {
        label: 'Metadata',
        description: '未対応 fields を保持',
      },
      skip: {
        label: 'Import しない',
        description: 'この column を無視',
      },
    },
  },
  createMenu: {
    button: 'Create',
    task: 'Task',
    project: 'Project',
    meeting: 'Meeting',
    creating: '作成中...',
    createProject: 'Project を作成',
    projectDialogTitle: 'Project を作成',
    projectDialogDescription: 'Project 名と任意の説明を入力してから開きます。',
  },
  recall: {
    actions: {
      copy: 'コピー',
      copied: 'コピー済み',
      edit: '編集',
    },
    status: {
      pending: '待機中',
      botCreated: 'Bot 送信済み',
      inCall: '通話中',
      recording: '録画中',
      callEnded: '通話終了',
      recordingDone: '録画完了',
      transcribing: '文字起こし中',
      transcriptReady: '文字起こし完了',
      failed: '失敗',
      archived: 'アーカイブ済み',
    },
    notetakerButton: {
      title: 'Cogno Notetaker を Meeting に送信',
      ariaLabel: 'Cogno Notetaker を送信',
    },
    startDialog: {
      title: 'Cogno Notetaker を送信',
      description:
        'Zoom / Google Meet / Microsoft Teams の URL を貼り付けてください。Bot が参加し、録画して、文字起こしをここに投稿します。',
      successTitle: 'Notetaker を送信しました',
      successDescription:
        'Cogno が参加します。通話が終了すると文字起こしがここに表示されます。',
      joiningMessage: 'Cogno Notetaker が Meeting に参加しています...',
      joiningDescription:
        'プラットフォームによっては、Bot が通話に表示されるまで最大 1 分かかることがあります。',
      titlePlaceholder: 'Title（任意）',
      urlHttpsError: 'URL は https:// で始まる必要があります',
      urlInvalidError: '有効な URL を入力してください',
      starting: '開始中...',
      startNotetaker: 'Notetaker を開始',
    },
    stopDialog: {
      title: 'Cogno Notetaker を停止しますか？',
      description:
        'Bot は今すぐ Meeting から退出します。ここまでに録画された内容は引き続き文字起こしされます。',
      keepRecording: '録画を続ける',
      stopping: '停止中...',
      stopNotetaker: 'Notetaker を停止',
    },
    page: {
      title: 'Meetings',
      description: 'Meeting の文字起こしと録画を確認します。',
      workspaceNotSelected: 'Workspace が選択されていません。',
      list: '一覧',
      selectMeeting: '左側の Meeting を選択すると文字起こしを表示できます。',
    },
    list: {
      scheduledMeetings: '予定されている Meetings',
      scheduledMeetingsDescription:
        'この Workspace であなたのアカウントに紐づく Meeting だけを表示します。',
      loadingScheduledMeetings: '予定されている Meetings を読み込み中...',
      loadingMeetings: 'Meetings を読み込み中...',
      failedLoadMeetings: 'Meetings を読み込めませんでした',
      emptyMeetings:
        'Meeting はまだありません。下のボタンから Cogno Notetaker を Zoom / Google Meet / Microsoft Teams の ミーティング に追加。',
      noTitle: '（Title なし）',
      timeUnavailable: '時刻を取得できません',
      moreScheduled: '（他 {{count}} 件）',
      recurrence: {
        daily: '毎日',
        weekly: '毎週',
      },
    },
    calendarIntegration: {
      description:
        'Google Calendar の接続状態を管理します。各 member が自分の Google Calendar を接続します。',
      yourConnection: 'あなたの接続',
      connected: '接続済み',
      statusLabel: '状態: {{status}}',
      lastSync: '最終同期 {{date}}',
      disconnect: '接続解除',
      waitingAuthorization: 'Google 認証を待機中...',
      openingGoogle: 'Google を開いています...',
      connectCalendar: '自分の Google Calendar を接続',
      authorizationHelp:
        'popup で認証を完了してください。接続状態は自動で反映されます。',
      workspaceMembers: 'Workspace members',
      noWorkspaceMembers:
        'この Workspace で Google Calendar を接続している member はまだいません。',
      you: 'あなた',
      disconnectDialogTitle: 'Google Calendar の接続を解除',
      disconnectDialogDescription:
        '接続を解除すると、自動同期と自動参加が停止します。',
      disconnecting: '接続解除中...',
    },
    taskTranscript: {
      toggleLabel: '文字起こし',
      loading: '文字起こしを読み込み中...',
      unavailable: '文字起こしを取得できません',
    },
    detail: {
      loadingMeeting: 'Meeting を読み込み中...',
      failedLoadMeeting: 'Meeting を読み込めませんでした',
      untitledMeeting: 'Untitled meeting',
      editableMeetingTitle: '編集可能な Meeting title',
      meetingTitlePlaceholder: 'Meeting title',
      editMeetingTitle: 'Meeting title を編集',
      titleEmptyError: 'Title は空にできません。',
      titleSaveError: 'Title を保存できませんでした。',
      stopNotetaker: 'Notetaker を停止',
      meetingLink: 'Meeting link',
      transcriptTitle: '文字起こし',
      transcriptEmptyError: '文字起こしは空にできません。',
      transcriptSaveError: '文字起こしを保存できませんでした。',
      editableSpeakerName: '{{speaker}} の話者名を編集',
      speakerPlaceholder: '話者',
      editableTranscriptText: '{{speaker}} の文字起こし text を編集',
      noTranscriptLines: '文字起こしの行はありません。',
      transcriptProcessing:
        'Bot の処理が完了すると、ここに文字起こしが表示されます。',
      noTranscript: 'この Meeting の文字起こしはありません。',
      languageCode: '言語: {{code}}',
      summaryTitle: '要約',
      summaryGenerated: '{{date}} に生成',
      summaryEmptyError: '要約は空にできません。',
      summarySaveError: '要約を保存できませんでした。',
      shortSummary: '短い要約',
      shortSummaryDescription: '箇条書きの上に表示される主な要点です。',
      editableMeetingSummary: '編集可能な Meeting 要約',
      keyPoints: '重要ポイント',
      keyPointsDescription: '1 行が 1 つの bullet item として保存されます。',
      editableSummaryBullets: '編集可能な要約 bullet items',
    },
    failureCodes: {
      generic: {
        title: 'Bot が失敗しました',
        description: 'Notetaker は録画完了前に停止しました。',
      },
      unknown: {
        description:
          'Notetaker は録画完了前に停止しました。詳細は下の raw error を確認してください。',
      },
      invalidMeetingLink: {
        title: '無効な Meeting link',
        description:
          'Recall はこの URL を Meeting link として認識できませんでした。',
        suggestion: 'URL を確認し、新しい Notetaker を開始してください。',
      },
      meetingNotStarted: {
        title: 'Meeting が開始されていません',
        description: '参加者が入る前に Bot が通話へ到達しました。',
        suggestion: 'Meeting を開始してから Notetaker を送信してください。',
      },
      meetingNotFound: {
        title: 'Meeting が見つかりません',
        description: 'Bot が到着した時点で Meeting ID が無効でした。',
        suggestion:
          'Meeting が進行中であることを確認し、Notetaker を再送信してください。',
      },
      waitingRoomTimeout: {
        title: 'Waiting room で停止しました',
        description: 'timeout までに Bot が承認されませんでした。',
        suggestion:
          '次回は host に Cogno Notetaker の参加を承認してもらってください。',
      },
      waitingRoomAdmitFailed: {
        title: 'Bot が承認されませんでした',
        description: 'host が waiting room からの Bot 参加を拒否しました。',
        suggestion: 'Cogno Notetaker が参加を要求したら承認してください。',
      },
      nooneJoinedTimeout: {
        title: '参加者がいません',
        description: 'Bot は待機しましたが参加者が入りませんでした。',
      },
      everyoneLeftTimeout: {
        title: '全員が退出しました',
        description:
          '参加者全員が退出したため、Bot は session を終了しました。',
      },
      botKickedFromCall: {
        title: 'Bot が削除されました',
        description:
          'host または co-host が Cogno Notetaker を通話から削除しました。',
      },
      recordingPermissionDenied: {
        title: '録画が拒否されました',
        description: 'host が Bot に録画権限を付与しませんでした。',
        suggestion: 'host にこの参加者からの録画を許可してもらってください。',
      },
      meetingLocked: {
        title: 'Meeting がロックされています',
        description: 'Bot が参加する前に host が Meeting をロックしました。',
        suggestion:
          '一時的に Meeting のロックを解除し、Notetaker を再送信してください。',
      },
      signinRequired: {
        title: 'サインインが必要です',
        description: 'この Meeting は参加者のサインインが必要です。',
        suggestion:
          'guest 参加を許可するか、別の platform を使用してください。',
      },
      internalError: {
        title: 'Recall.ai internal error',
        description: 'Bot 実行中に Recall.ai 側で問題が発生しました。',
        suggestion: 'Notetaker をもう一度送信してください。',
      },
    },
  },
  workerSetup: {
    title: 'Worker 環境をセットアップ',
    subtitle:
      '面倒な作業は Claude Code が引き受けます。プロンプトをコピーして貼り付けるだけです。',
    codexTitle: 'Worker 用に Codex をセットアップ',
    codexSubtitle:
      'Codex が主要な作業を行います — サインインしてから、プロンプトをコピーして貼り付けます。',
    closeAria: '閉じる',
    close: '閉じる',
    done: '完了',
    verify: '確認',
    verifying: '確認中…',
    docsLink: 'Claude Code ドキュメント',
    codexDocsLink: 'Codex CLI documentation',
    preflightFailed: 'Preflight に失敗しました: {{error}}',
    copyAria: '{{label}}をコピー',
    copiedAria: '{{label}}をコピーしました',
    installCommandLabel: 'インストールコマンド',
    loginCommandLabel: 'ログインコマンド',
    setupPromptLabel: 'セットアッププロンプト',
    signInButton: 'サインイン',
    osSwitcherLabel: '対象OS',
    osLabels: {
      mac: 'macOS',
      windows: 'Windows',
      linux: 'Linux',
    },
    steps: {
      node: {
        title: 'Node.js をインストール',
        description: {
          mac: 'Claude Code はグローバルな npm パッケージのため、先に Node.js が必要です。nodejs.org から LTS インストーラーをダウンロードしてください（Homebrew をお使いなら「brew install node」でも可）。',
          windows:
            'Claude Code はグローバルな npm パッケージのため、先に Node.js が必要です。winget でインストールするか、nodejs.org から LTS インストーラーをダウンロードしてください。',
          linux:
            'Claude Code はグローバルな npm パッケージのため、先に Node.js が必要です。ディストリビューションのパッケージマネージャー（apt, dnf, pacman など）でインストールするか、nodejs.org から LTS インストーラーをダウンロードしてください。',
          unknown:
            'Claude Code はグローバルな npm パッケージとして配布されるため、先に Node.js のインストールが必要です。まだの場合は nodejs.org から LTS インストーラーをダウンロードしてください。',
        },
        downloadLink: 'Node.js (LTS) をダウンロード',
      },
      claude: {
        title: 'Claude Code をインストール',
        description: {
          mac: 'Node.js をインストールしたら、npm で Claude Code をグローバルにインストールします:',
          windows:
            'Node.js をインストールしたら、npm で Claude Code をグローバルにインストールします:',
          linux:
            'Node.js をインストールしたら、npm で Claude Code をグローバルにインストールします（Linux では通常 sudo が必要です）:',
          unknown:
            'Node.js をインストールしたら、npm で Claude Code をグローバルにインストールします:',
        },
      },
      codex: {
        title: 'Codex をインストール',
        description: {
          mac: 'このコンピューターに Codex CLI をインストールします:',
          windows: 'このコンピューターに Codex CLI をインストールします:',
          linux: 'このコンピューターに Codex CLI をインストールします:',
          unknown: 'このコンピューターに Codex CLI をインストールします:',
        },
      },
      open: {
        title: 'Claude Code を開く',
        description:
          'ターミナルを開いて claude を実行します。インストール済みであれば Claude Code デスクトップアプリを起動しても構いません。',
      },
      login: {
        claude: {
          title: 'Claude Code にサインイン',
          description:
            'Claude Code を一度起動し、サインインを完了します。埋め込みターミナルからログインコマンドを実行し、ブラウザ認証へ進めます。',
        },
        codex: {
          title: 'Codex にサインイン',
          description:
            'Codex を一度起動し、サインインを完了します。埋め込みターミナルからログインコマンドを実行し、ブラウザ認証へ進めます。',
        },
      },
      prompt: {
        title: 'セットアッププロンプトをコピーして Claude Code に貼り付ける',
        codexTitle: 'セットアッププロンプトをコピーして Codex に貼り付ける',
        description:
          '下のプロンプトをコピーして Claude Code に貼り付けてください。git と gh を確認し、不足しているものをインストールし、認証を処理します。',
        codexDescription:
          '下のプロンプトをコピーして Codex に貼り付けてください。git と gh を確認し、不足しているものをインストールし、認証を処理します。',
      },
      verify: {
        title: 'Claude Code が完了したと表示したら、下の「確認」をクリック',
        codexTitle: 'Codex が完了したと表示したら、下の「確認」をクリック',
        description:
          'もう一度かんたんな preflight チェックを実行して、すべて準備できているか確認します。',
        codexDescription:
          'もう一度かんたんな preflight チェックを実行して、Codex と Worker の前提条件が準備できているか確認します。',
      },
    },
    tools: {
      notInstalled: '未インストール',
      installed: 'インストール済み',
      installedNotAuthed: 'インストール済み、未認証',
      ready: '準備完了',
    },
    setupPrompt: `Cogno の worker 用に開発環境をセットアップするのを手伝ってください。
不足している前提条件を確認してインストールし、必要に応じて認証してください。

実行する手順:

1. **シェルコマンドを実行できることを確認** — Cogno の worker はヘッドレスモードであなた（Claude Code）を動かすため、bash を実行できる必要があります。Claude Code を新規インストールした場合は、ログインを完了し、初回の「このフォルダを信頼する／コマンド実行を許可する」プロンプトを承認してください。その後 \`echo cogno-bash-ok\` を実行し、出力されることを確認してください。実行できない場合は、ここで中断し、コマンド実行をブロックしている権限や信頼設定が何かを正確に伝えてください — 以降の手順はこれに依存します。

2. **git の確認** — \`git --version\` を実行します。未インストールの場合:
   - macOS: \`brew install git\`（または Xcode Command Line Tools をインストール）
   - Linux: パッケージマネージャー（apt, dnf, pacman など）を使用
   - Windows: \`winget install Git.Git\`

3. **GitHub CLI (gh) の確認** — \`gh --version\` を実行します。未インストールの場合:
   - macOS: \`brew install gh\`
   - Linux: お使いのディストリビューション向けに https://github.com/cli/cli#installation を参照
   - Windows: \`winget install GitHub.cli\`
   その後 \`gh auth status\` を実行 — 未認証なら \`gh auth login\` を実行して指示に従ってください。

4. **Claude Code の認証確認** — \`claude auth status\` を実行してログイン済みか確認します。
   ログインしていなければ \`claude auth login\` を実行してください。

5. **最終確認** — \`git --version && gh auth status && claude auth status\` を実行し、すべて通ることを確認します。

各手順を進め、不足しているものをインストールし、必要な認証フローを処理してください。
すべて緑色になったら「Setup complete — you can now click Verify in the Cogno app.」と伝えてください。`,
    codexSetupPrompt: `Cogno の worker 用に開発環境をセットアップするのを手伝ってください。
不足している前提条件を確認してインストールし、必要に応じて認証してください。

実行する手順:

1. **シェルコマンドを実行できることを確認** — Cogno の worker はヘッドレスモードであなた（Codex）を動かすため、シェルコマンドを実行できる必要があります。Codex を新規インストールした場合は、ログインを完了し、初回の信頼設定やコマンド実行許可のプロンプトを承認してください。その後 \`echo cogno-shell-ok\` を実行し、出力されることを確認してください。実行できない場合は、ここで中断し、コマンド実行をブロックしている権限や信頼設定が何かを正確に伝えてください — 以降の手順はこれに依存します。

2. **git の確認** — \`git --version\` を実行します。未インストールの場合:
   - macOS: \`brew install git\`（または Xcode Command Line Tools をインストール）
   - Linux: パッケージマネージャー（apt, dnf, pacman など）を使用
   - Windows: \`winget install Git.Git\`

3. **GitHub CLI (gh) の確認** — \`gh --version\` を実行します。未インストールの場合:
   - macOS: \`brew install gh\`
   - Linux: お使いのディストリビューション向けに https://github.com/cli/cli#installation を参照
   - Windows: \`winget install GitHub.cli\`
   その後 \`gh auth status\` を実行 — 未認証なら \`gh auth login\` を実行して指示に従ってください。

4. **Codex の認証確認** — \`codex login status\` を実行してログイン済みか確認します。
   ログインしていなければ \`codex login\` を実行してください。

5. **最終確認** — \`git --version && gh auth status && codex login status\` を実行し、すべて通ることを確認します。

各手順を進め、不足しているものをインストールし、必要な認証フローを処理してください。
すべて緑色になったら「Setup complete — you can now click Verify in the Cogno app.」と伝えてください。`,
  },
} satisfies Messages;
