import { Link, usePage } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User } from '@/types';

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}

export default function Header() {
    const { auth } = usePage().props as { auth: { user?: User } };
    const user = auth.user;

    return (
        <header className="sticky top-0 z-50 h-16 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="mx-auto flex h-full items-center justify-between px-4 md:max-w-7xl md:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-3">
                    {/* <span className="text-xl font-bold text-[var(--color-fg)] dark:text-zinc-100">
            FoHo
          </span> */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        version="1.0"
                        width="72px"
                        height="48px"
                        viewBox="0 0 1517.813195 648.538227"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <g
                            transform="translate(-192.108414,1148.538227) scale(0.100000,-0.100000)"
                            fill="#333333"
                            stroke="none"
                        >
                            <path d="M5760 11447 c-6 -23 -15 -58 -20 -77 -5 -19 -22 -90 -39 -157 -56 -222 -92 -366 -121 -483 -16 -63 -43 -171 -60 -240 -17 -69 -45 -179 -61 -245 -17 -66 -41 -163 -55 -215 -14 -52 -27 -108 -30 -125 -5 -33 -22 -98 -30 -119 -4 -10 18 -20 74 -35 43 -11 83 -21 89 -21 5 0 18 35 28 78 10 42 29 117 42 166 13 49 28 107 33 130 4 22 45 185 89 361 45 176 83 329 85 340 2 11 16 67 31 125 15 58 40 159 57 225 16 66 38 152 49 192 10 39 19 76 19 82 0 5 -33 20 -72 31 -40 12 -79 23 -85 25 -8 3 -17 -13 -23 -38z" />
                            <path d="M3665 11368 c-27 -11 -58 -22 -67 -25 -10 -3 -18 -8 -18 -12 0 -11 97 -258 125 -318 8 -17 15 -35 15 -40 0 -8 38 -103 91 -224 16 -36 29 -70 29 -75 0 -9 37 -101 91 -225 16 -36 29 -70 29 -74 0 -8 31 -86 90 -225 11 -25 40 -99 66 -165 26 -66 52 -133 59 -150 8 -16 23 -56 35 -87 l22 -57 31 14 c18 7 53 22 79 32 27 10 48 23 48 28 0 11 -25 80 -59 165 -13 30 -35 87 -51 125 -26 66 -52 129 -121 300 -52 130 -112 280 -134 340 -13 33 -42 105 -65 160 -23 55 -52 127 -65 160 -12 33 -39 101 -60 150 -37 91 -85 215 -85 221 0 9 -39 1 -85 -18z" />
                            <path d="M7645 9811 c-65 -30 -146 -67 -295 -131 -52 -23 -113 -50 -135 -60 -22 -9 -71 -31 -110 -48 -38 -16 -116 -51 -173 -76 -56 -25 -105 -46 -108 -46 -3 0 -45 -18 -92 -39 -119 -53 -350 -155 -447 -197 -63 -28 -154 -69 -172 -79 -3 -2 44 -121 58 -147 8 -15 15 -14 77 13 67 30 82 37 217 96 39 17 88 39 110 48 22 10 99 44 170 75 72 31 146 64 165 73 62 27 293 129 360 158 71 30 300 131 420 184 41 18 83 35 92 38 16 6 13 15 -20 86 -20 44 -41 80 -47 80 -5 0 -37 -12 -70 -28z" />
                            <path d="M3856 9210 l-189 -189 -531 -3 c-599 -3 -581 -1 -634 -81 l-27 -41 -3 -540 -2 -541 -259 -260 c-142 -143 -266 -275 -275 -294 -23 -49 -20 -84 14 -139 50 -82 138 -113 214 -77 18 9 86 70 152 135 65 66 126 120 136 120 16 0 17 -46 20 -682 4 -660 5 -686 25 -773 61 -250 170 -451 337 -619 105 -106 117 -115 212 -179 l72 -47 3132 0 3132 0 -6 25 c-17 67 -63 127 -113 146 -14 5 -671 9 -1594 9 l-1569 0 0 1060 c0 849 3 1060 13 1060 7 0 60 -48 117 -106 126 -128 178 -164 235 -164 119 0 212 138 160 241 -9 19 -488 505 -1063 1082 l-1047 1047 -235 -1 -235 0 -189 -189z m1164 -805 l725 -725 0 -1243 0 -1242 -1040 -3 c-929 -2 -1050 -1 -1135 14 -320 55 -601 299 -703 610 -47 144 -47 150 -47 1029 l0 830 727 727 c401 401 732 728 738 728 6 0 336 -326 735 -725z m-1730 252 c0 -17 -454 -469 -463 -461 -9 9 -9 458 0 467 3 4 109 7 235 7 176 0 228 -3 228 -13z" />
                            <path d="M15015 9234 c-191 -49 -261 -79 -355 -150 -158 -119 -268 -285 -337 -509 -50 -160 -63 -340 -63 -892 l0 -443 -339 0 -340 0 -3 589 -3 589 -31 39 c-66 82 -187 119 -384 117 -386 -5 -745 -137 -931 -343 -292 -323 -170 -787 206 -785 131 0 237 61 289 166 44 89 28 196 -37 257 -39 35 -106 35 -144 0 -44 -42 -87 -59 -146 -59 -74 0 -110 32 -126 112 -40 192 113 362 416 464 138 46 226 48 272 5 l31 -29 0 -561 0 -562 -165 3 -165 3 0 -72 0 -73 165 0 166 0 -1 -624 c-2 -666 -2 -667 -53 -816 -76 -223 -242 -342 -477 -344 -85 -1 -101 2 -153 28 -60 29 -125 98 -151 160 -14 34 -59 86 -74 86 -25 0 -80 -50 -101 -93 -48 -96 -29 -155 68 -214 171 -103 582 -105 873 -4 321 112 516 302 613 595 38 112 45 234 45 764 l0 462 340 0 340 0 0 -517 c0 -593 6 -671 53 -751 109 -182 398 -203 705 -50 67 34 122 66 122 73 0 6 -6 19 -12 28 -12 16 -17 16 -70 -4 -82 -29 -154 -24 -182 14 -21 28 -21 37 -24 618 l-2 589 185 0 185 0 0 73 0 72 -186 -3 -186 -3 5 693 c3 381 10 734 16 784 13 113 56 248 98 308 18 25 51 58 74 73 36 24 55 29 126 32 78 3 87 1 123 -24 39 -27 73 -68 128 -152 31 -48 68 -79 104 -88 21 -5 34 0 64 28 34 31 38 40 42 93 4 54 1 62 -27 98 -73 92 -227 145 -436 151 -71 2 -139 2 -150 -1z" />
                            <path d="M9095 8573 c-60 -3 -179 -14 -348 -32 -258 -28 -546 -133 -716 -261 -187 -141 -261 -299 -248 -527 5 -79 10 -101 38 -153 35 -67 81 -113 155 -156 46 -27 55 -29 164 -29 133 1 171 14 245 91 52 53 69 98 69 179 -1 98 -39 155 -120 179 -16 5 -41 -7 -95 -44 -68 -45 -79 -50 -131 -50 -52 0 -61 3 -88 31 -59 63 -68 173 -19 265 37 71 74 111 156 171 105 75 333 161 481 181 l62 9 0 -584 0 -583 -140 0 -140 0 0 -70 0 -70 140 0 140 0 0 -533 c0 -573 1 -592 52 -667 13 -19 46 -45 73 -59 46 -24 61 -26 170 -26 111 0 124 2 172 27 64 34 96 76 111 146 8 37 12 217 12 583 l0 529 360 0 360 0 0 70 0 70 -360 0 -360 0 2 593 3 592 125 -3 c321 -9 540 -52 666 -131 36 -23 71 -41 78 -41 20 0 44 31 61 79 31 90 12 150 -57 174 -98 35 -768 66 -1073 50z" />
                            <path d="M10965 7729 c-22 -4 -56 -10 -75 -13 -93 -14 -262 -103 -345 -183 -192 -185 -285 -428 -285 -748 0 -323 93 -563 286 -744 87 -81 183 -137 304 -177 79 -26 96 -28 245 -28 154 0 163 1 249 32 122 44 200 90 285 169 123 113 187 216 251 400 41 117 54 247 47 455 -6 155 -8 173 -41 271 -53 159 -123 274 -222 366 -51 48 -154 121 -169 121 -4 0 -30 11 -58 24 -58 26 -89 37 -120 41 -12 1 -51 8 -87 14 -74 12 -206 13 -265 0z m197 -173 c93 -28 157 -134 189 -316 38 -212 37 -655 -2 -900 -26 -165 -86 -278 -171 -321 -71 -36 -170 -17 -225 43 -43 47 -88 146 -99 218 -3 19 -10 54 -15 76 -5 23 -14 118 -20 210 -17 250 -5 482 36 738 10 57 68 177 103 209 32 31 91 56 133 57 14 0 46 -6 71 -14z" />
                            <path d="M16090 7721 c-335 -68 -568 -314 -642 -681 -30 -145 -30 -364 -1 -505 22 -104 78 -256 113 -305 11 -15 20 -31 20 -35 0 -3 21 -34 46 -66 111 -145 290 -250 493 -290 92 -18 280 -7 366 21 39 13 75 25 82 26 35 7 174 97 234 152 104 96 233 309 254 417 3 17 12 57 21 90 9 37 17 125 21 230 5 175 6 164 -42 391 -8 36 -71 167 -108 224 -53 84 -121 155 -198 206 -81 54 -209 110 -271 119 -24 4 -65 11 -92 16 -73 14 -200 9 -296 -10z m241 -166 c80 -28 125 -91 168 -230 37 -119 56 -472 40 -755 -21 -380 -100 -553 -259 -567 -147 -14 -237 106 -281 376 -15 94 -21 476 -11 661 18 304 86 472 209 516 50 17 81 17 134 -1z" />
                        </g>
                    </svg>
                </Link>

                <div className="flex items-center gap-1">
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-9 rounded-full p-0"
                                >
                                    <Avatar className="size-8">
                                        <AvatarImage
                                            src={user.avatar}
                                            alt={user.name}
                                        />
                                        <AvatarFallback className="rounded-full bg-gray-100 text-xs text-[var(--color-fg)] dark:bg-zinc-800 dark:text-zinc-100">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-64" align="end">
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-3 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="size-9 rounded-full">
                                            <AvatarImage
                                                src={user.avatar}
                                                alt={user.name}
                                            />
                                            <AvatarFallback className="rounded-full bg-gray-100 text-xs text-[var(--color-fg)] dark:bg-zinc-800 dark:text-zinc-100">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 leading-tight">
                                            <span className="truncate font-medium text-[var(--color-fg)] dark:text-zinc-100">
                                                {user.name}
                                            </span>
                                            <span className="truncate text-xs text-[var(--color-muted)] dark:text-zinc-400">
                                                {user.email}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href="/settings/profile"
                                        prefetch
                                        className="flex w-full cursor-pointer items-center gap-2"
                                    >
                                        <Settings className="size-4" />
                                        <span>Настройки</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        className="flex w-full cursor-pointer items-center gap-2"
                                    >
                                        <LogOut className="size-4" />
                                        <span>Выйти</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </header>
    );
}
