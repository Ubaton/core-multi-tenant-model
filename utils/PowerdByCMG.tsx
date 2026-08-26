import React from 'react'
import { cn } from '@/lib/utils';


const PowerdByCMG = () => {

    const CMG_URL = 'https://creativemindsgraphics.com/'

  return (
          <div className="flex justify-center">
            <a
              href={CMG_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Powered by Creative Minds Graphics"
              className={cn(
                'flex items-center gap-1.5 rounded px-1 outline-none',
                'select-none whitespace-nowrap text-[11px] leading-none text-muted-foreground/70',
                'transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60'
              )}
            >
              <span className="relative block h-4 w-7 shrink-0 overflow-hidden opacity-80">
                <img
                  src="/icons/CMG-Black-Logo.png"
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-contain object-center dark:hidden"
                />
                <img
                  src="/icons/CMG-White-Logo.png"
                  alt=""
                  aria-hidden="true"
                  className="hidden h-full w-full object-contain object-center dark:block"
                />
              </span>
              <span>Powered by</span>
              <span className="font-semibold text-foreground/80">CMG</span>
            </a>
          </div>
  )
}

export default PowerdByCMG
