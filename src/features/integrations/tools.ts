import {
  Calendar,
  FileText,
  Folder,
  Github,
  Kanban,
  MessageSquare,
  Slack,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';

export type IntegrationTool = {
  name: string;
  description: string;
  Icon: LucideIcon;
};

export const integrationTools: IntegrationTool[] = [
  {
    name: 'Slack',
    description: 'Workspace messages',
    Icon: Slack,
  },
  {
    name: 'Jira',
    description: 'Issues and project tracking',
    Icon: Kanban,
  },
  {
    name: 'Google Meet',
    description: 'Video meetings',
    Icon: Video,
  },
  {
    name: 'Zoom',
    description: 'Video calls and webinars',
    Icon: Video,
  },
  {
    name: 'Google Calendar',
    description: 'Schedules and availability',
    Icon: Calendar,
  },
  {
    name: 'GitHub',
    description: 'Code and pull requests',
    Icon: Github,
  },
  {
    name: 'Notion',
    description: 'Docs and knowledge base',
    Icon: FileText,
  },
  {
    name: 'Linear',
    description: 'Product planning',
    Icon: MessageSquare,
  },
  {
    name: 'Microsoft Teams',
    description: 'Team chat and meetings',
    Icon: Users,
  },
  {
    name: 'Google Drive',
    description: 'Files and shared folders',
    Icon: Folder,
  },
];
