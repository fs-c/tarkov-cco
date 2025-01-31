import { ReadonlySignal } from '@preact/signals';
import { formatPrice } from '../utils';
import { Solution } from '../solver';
import { ItemMetadata } from '../item-data';
import { twMerge } from 'tailwind-merge';

export function SolutionList({
    solutions,
    onCombinationListItemClick,
    className,
}: {
    solutions: ReadonlySignal<Solution[]>;
    onCombinationListItemClick: (item: ItemMetadata) => void;
    className?: string;
}) {
    return (
        <div
            className={twMerge(
                'flex max-h-screen flex-col overflow-y-auto px-8',
                className,
            )}
        >
            <div className='flex flex-row flex-wrap gap-4 py-8'>
                {solutions.value.map((solution) => (
                    <div className='flex flex-col gap-4 rounded-md border-stone-800 bg-stone-900 p-4'>
                        <div className='flex flex-row gap-4'>
                            {solution.map(({ count, item }) => (
                                <div
                                    className={'group relative cursor-pointer'}
                                    onClick={() =>
                                        onCombinationListItemClick(item)
                                    }
                                >
                                    <div className='overflow-hidden rounded-md border border-stone-700 transition-all group-hover:border-stone-400'>
                                        <img
                                            src={item.iconLink}
                                            className='h-16 w-16 scale-[1.05] [clip-path:inset(1px)]'
                                            alt={item.name}
                                            title={item.name}
                                        />
                                    </div>

                                    {/* this is completely insane but otherwise the count didn't look centered */}
                                    <div className='absolute right-0 bottom-0 aspect-square h-5 translate-x-1/2 translate-y-1/2 rounded-full bg-stone-300 text-center text-sm font-semibold text-stone-900'>
                                        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
                                            {count}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className='flex w-full flex-row gap-4 text-stone-300'>
                            <p>
                                {formatPrice(
                                    solution.reduce(
                                        (acc, { count, item }) =>
                                            acc + count * item.basePrice,
                                        0,
                                    ),
                                )}{' '}
                                <span className='text-stone-400'>Base</span>
                            </p>

                            <p>
                                {formatPrice(
                                    solution.reduce(
                                        (acc, { count, item }) =>
                                            acc + count * item.lastLowPrice,
                                        0,
                                    ),
                                )}{' '}
                                <span className='text-stone-400'>Flea</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className='flex-grow'></div>

            <div className='flex flex-col gap-2 py-8'>
                <p>
                    Optimal{' '}
                    <a
                        className='underline'
                        href='https://escapefromtarkov.fandom.com/wiki/Hideout#Cultist_Circle'
                    >
                        Tarkov Cultist Circle
                    </a>{' '}
                    inputs, using data from{' '}
                    <a className='underline' href='https://tarkov.dev'>
                        tarkov.dev
                    </a>{' '}
                    and{' '}
                    <a className='underline' href='https://sp-tarkov.com/'>
                        SPT
                    </a>
                    .
                </p>

                <p>
                    <a
                        className='underline'
                        href='https://github.com/fs-c/tarkov-cco'
                    >
                        github/tarkov-cco
                    </a>
                </p>
            </div>
        </div>
    );
}
