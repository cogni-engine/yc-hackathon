import { SlackLogo } from '@/components/SlackLogo';

export default function IntegrationsPage() {
  return (
    <section className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-8'>
      <div>
        <h1 className='text-2xl font-semibold text-text-primary'>
          Integrations
        </h1>
        <p className='mt-1 text-sm text-text-secondary'>
          Connect tools your workspace uses.
        </p>
      </div>

      <div className='rounded-md border border-border-default bg-surface-primary p-4'>
        <div className='flex items-center gap-3'>
          <div className='inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-text-primary'>
            <SlackLogo className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <h2 className='text-base font-medium text-text-primary'>Slack</h2>
            <p className='text-sm text-text-secondary'>
              Bring workspace conversation into Pillow.
            </p>
          </div>
          <button
            type='button'
            className='inline-flex h-9 items-center justify-center rounded-md bg-text-primary px-4 text-sm font-medium text-surface-primary transition-colors hover:opacity-90'
          >
            Connect
          </button>
        </div>
      </div>
    </section>
  );
}
