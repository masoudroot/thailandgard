import { BadgeCheck } from 'lucide-react';

interface TourHighlightsProps {
  highlights: string[];
  title?: string;
  className?: string;
}

export function TourHighlights({
  highlights,
  title = 'هایلایت‌های تور',
  className = '',
}: TourHighlightsProps) {
  return (
    <section className={className} aria-labelledby='tour-highlights-title'>
      <div className='flex items-center gap-2'>
        <BadgeCheck className='size-5 text-amber-600' aria-hidden='true' />
        <h2
          id='tour-highlights-title'
          className='font-pinar text-xl font-bold text-foreground'
        >
          {title}
        </h2>
      </div>
      <ul className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {highlights.map((highlight, index) => (
          <li
            key={`${highlight}-${index}`}
            className='flex items-start gap-3 rounded-lg border border-border bg-background p-4 transition duration-200 hover:border-amber-500/50'
          >
            <span className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600'>
              <BadgeCheck className='size-4' aria-hidden='true' />
            </span>
            <span className='font-iransans text-sm leading-7 text-foreground'>
              {highlight}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
