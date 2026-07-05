type BrandLogoProps = {
  className?: string;
};

function ExternalLogo({
  src,
  className,
}: BrandLogoProps & { src: string }) {
  return (
    <img
      src={src}
      alt=''
      aria-hidden='true'
      className={className}
      draggable={false}
      loading='lazy'
    />
  );
}

export function JiraLogo(props: BrandLogoProps) {
  return <ExternalLogo {...props} src='https://cdn.simpleicons.org/jira' />;
}

export function GoogleMeetLogo(props: BrandLogoProps) {
  return (
    <ExternalLogo
      {...props}
      src='https://commons.wikimedia.org/wiki/Special:Redirect/file/Google_Meet_icon_(2020).svg'
    />
  );
}

export function ZoomLogo(props: BrandLogoProps) {
  return <ExternalLogo {...props} src='https://cdn.simpleicons.org/zoom' />;
}

export function GoogleCalendarLogo(props: BrandLogoProps) {
  return (
    <ExternalLogo
      {...props}
      src='https://commons.wikimedia.org/wiki/Special:Redirect/file/Google_Calendar_icon_(2020).svg'
    />
  );
}

export function GitHubLogo(props: BrandLogoProps) {
  return (
    <ExternalLogo
      {...props}
      src='https://cdn.simpleicons.org/github/181717/FFFFFF'
    />
  );
}

export function NotionLogo(props: BrandLogoProps) {
  return (
    <ExternalLogo
      {...props}
      src='https://cdn.simpleicons.org/notion/000000/FFFFFF'
    />
  );
}

export function LinearLogo(props: BrandLogoProps) {
  return <ExternalLogo {...props} src='https://cdn.simpleicons.org/linear' />;
}

export function MicrosoftTeamsLogo(props: BrandLogoProps) {
  return (
    <ExternalLogo
      {...props}
      src='https://commons.wikimedia.org/wiki/Special:Redirect/file/Microsoft_Office_Teams_(2025%E2%80%93present).svg'
    />
  );
}

export function GoogleDriveLogo(props: BrandLogoProps) {
  return (
    <ExternalLogo
      {...props}
      src='https://commons.wikimedia.org/wiki/Special:Redirect/file/Google_Drive_icon_(2020).svg'
    />
  );
}
