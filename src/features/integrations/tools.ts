import type { ElementType } from 'react';
import {
  GitHubLogo,
  GoogleCalendarLogo,
  GoogleDriveLogo,
  GoogleMeetLogo,
  JiraLogo,
  LinearLogo,
  MicrosoftTeamsLogo,
  NotionLogo,
  ZoomLogo,
} from '@/components/BrandLogos';
import { SlackLogo } from '@/components/SlackLogo';

export type IntegrationTool = {
  name: string;
  description: string;
  Icon: ElementType<{ className?: string }>;
};

export const integrationTools: IntegrationTool[] = [
  {
    name: 'Slack',
    description: 'Workspace messages',
    Icon: SlackLogo,
  },
  {
    name: 'Jira',
    description: 'Issues and project tracking',
    Icon: JiraLogo,
  },
  {
    name: 'Google Meet',
    description: 'Video meetings',
    Icon: GoogleMeetLogo,
  },
  {
    name: 'Zoom',
    description: 'Video calls and webinars',
    Icon: ZoomLogo,
  },
  {
    name: 'Google Calendar',
    description: 'Schedules and availability',
    Icon: GoogleCalendarLogo,
  },
  {
    name: 'GitHub',
    description: 'Code and pull requests',
    Icon: GitHubLogo,
  },
  {
    name: 'Notion',
    description: 'Docs and knowledge base',
    Icon: NotionLogo,
  },
  {
    name: 'Linear',
    description: 'Product planning',
    Icon: LinearLogo,
  },
  {
    name: 'Microsoft Teams',
    description: 'Team chat and meetings',
    Icon: MicrosoftTeamsLogo,
  },
  {
    name: 'Google Drive',
    description: 'Files and shared folders',
    Icon: GoogleDriveLogo,
  },
];
