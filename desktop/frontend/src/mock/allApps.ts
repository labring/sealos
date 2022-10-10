import { TApp } from 'stores/app';

const defaultApps: TApp[] = [
  {
    name: 'Visual Studio Code',
    icon: 'https://raw.githubusercontent.com/blueedgetechno/win11React/master/public/img/icon/code.png',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'Visual Studio Code is a free, lightweight, and extensible code editor for building web, desktop, and mobile applications, using any programming language and framework.\nVisual Studio Code has built-in support for Git source control management and powerful integrations with GitHub, an integrated debugger, and smart code completion with IntelliSense and with Al-driven IntelliCode. With over 30,000 extensions and themes in the Visual Studio Code Marketplace, you can customize the features and the look of Visual Studio Code to fit your needs, preferences, and style.\nYou can use Visual Studio Code to build any kind of app, for web, desktop, and mobile. Visual Studio Code supports JavaScript and TypeScript natively and offers extensions for coding in languages such as Python, Java, C/C++, C#, Go, Rust, PHP, and many more.',
      feat: "Fast, Powerful Editing-Linting, multi-cursor editing, parameter hints, and other powerful editing features.\nOver 30,000 extensions, and growing - Enable additional languages, themes, debuggers, commands, and more. VS Code's growing community shares their secret sauce to improve your workflow.\nBuild any app type, using any programming language and framework, including JavaScript and TypeScript, Python, Java, C/C++, C#, Go, Rust, PHP, and many more, as well as many popular technologies.\nSupport for notebooks including Jupyter, for data science and Al development.\nBuilt-in support for Git source control management and integrations with GitHub for managing issues and pull requests.\nIntelligent Code Completion - IntelliSense and Al-driven IntelliCode offer completions for variables, methods, and imported modules.\nRich Debugging-Print debugging is a thing of the past. Use debugging tools directly in VS Code.\nWrite code from anywhere with the Visual Studio Code Remote extensions and support for GitHub Codespaces."
    }
  },
  {
    name: 'WSA',
    icon: 'https://android.blueedge.me/favicon.ico',
    type: 'app',
    size: 'maximize',
    gallery: ['https://tse3.mm.bing.net/th/id/OIP.05PhIEM3aFJNBwnzoetaHQHaEK?pid=ImgDet&rs=1'],
    data: {
      url: 'https://android.blueedge.me',
      desc: 'A recreation of Android by Blueedge.',
      feat: 'Use Android inside of Windows 11.'
    }
  },
  {
    name: 'WSL',
    icon: 'https://raw.githubusercontent.com/win11react/store/main/store/img/wsl.jpg',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://tse3.mm.bing.net/th/id/OIP.boxvK0oLF7DNBtBn1t5wjwHaEy?pid=ImgDet&rs=1',
      'https://miro.medium.com/max/2652/1*Hv7hbkxpOsNyzt5-Pv8FJQ.png'
    ],
    data: {
      url: 'https://notaperson535.github.io/vibeos/',
      desc: 'Run linux inside of windows!',
      feat: 'Run apps and more.'
    }
  },
  {
    name: 'Jitsi Meet',
    icon: 'https://avatars.githubusercontent.com/u/3671647',
    type: 'app',
    size: 'maximize',
    gallery: ['https://www.icescrum.com/wp-content/uploads/2020/03/jitsi1.png'],
    data: {
      url: 'https://meet.jit.si/',
      desc: 'Jitsi Meet is a fully encrypted, 100% open source video conferencing solution.',
      feat: 'video conferencing solution.'
    }
  },
  {
    name: 'CSTimer',
    icon: 'https://crowdin-static.downloads.crowdin.com/images/project-logo/341247/small/2e24845917ed2a16d6df8549c6fb78ef399.png',
    type: 'app',
    size: 'maximize',
    gallery: ['https://cstimer.net/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://cstimer.net',
      desc: "Professional timing program designed for Rubik's Cube Speed Solvers.",
      feat: 'It provides: Amounts of scramble algorithms, including all WCA official events, varieties of twisty puzzles, training scramble for specific sub steps (e.g. F2L, OLL, PLL, ZBLL, and can filter cases), etc.'
    }
  },
  {
    name: 'FNAF 1',
    icon: 'https://kevin.games/assets/images/new/fnaf-1.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://cdn.akamai.steamstatic.com/steam/apps/319510/ss_b5bf2127754d4e9bf6ab1c94e599d47f93a6708a.600x338.jpg',
      'https://cdn.akamai.steamstatic.com/steam/apps/319510/ss_9d4e5e5aa2eb01b5c81cb5849d8049978c080742.600x338.jpg',
      'https://cdn.akamai.steamstatic.com/steam/apps/319510/ss_cfe4d47366356fef6c7a8da2c0782b143584bbe4.116x65.jpg?t=1579635996'
    ],
    data: {
      url: 'https://run3.io/popgame/fnaf/fnaf1/',
      desc: "Welcome to your new summer job at Freddy Fazbear's Pizza, where kids and parents alike come for entertainment and food as far as the eye can see! The main attraction is Freddy Fazbear, of course; and his two friends. They are animatronic robots, programmed to please the crowds! The robots' behavior has become somewhat unpredictable at night however, and it was much cheaper to hire you as a security guard than to find a repairman.",
      feat: 'Ported by People'
    }
  },
  {
    name: 'Minecraft',
    icon: 'https://raw.githubusercontent.com/win11react/store/main/store/img/minecraft.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://www.minecraft.net/content/dam/games/minecraft/key-art/CavesandCliffsPt1-dotNET-HomepagePromo-600x360.png',
      'https://variety.com/wp-content/uploads/2019/02/minecraft-best-year-yet.png?w=600',
      'https://www.minecraft.net/content/dam/games/minecraft/screenshots/RayTracing-MineCraft-PMP-Always-Something-New.jpg'
    ],
    data: {
      url: 'https://classic.minecraft.net',
      desc: 'Minecraft is a sandbox construction video game developed by Mojang Studios where players interact with a fully modifiable three-dimensional environment made of blocks and entities.\nIts diverse gameplay lets players choose the way they play, allowing for countless possibilities. There are three actively maintained editions of Minecraft: Java Edition, Bedrock Edition, and Education Edition.',
      feat: '1.1 Combat changes.\n1.2 Fletching table functionality.\n1.3 Voted updates.\n1.4 Super Fancy graphics.\n1.5 Phasing out of NBT-based crafting recipes.\n1.6 Full split of liquids from blocks.\n1.7 Shaders.\n1.8 Archaeology.'
    }
  },
  {
    name: 'Candy Crush',
    icon: 'https://cdn2.downdetector.com/static/uploads/logo/mzl.ehlcwpta.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://media-cldnry.s-nbcnews.com/image/upload/t_nbcnews-fp-1200-630,f_auto,q_auto:best/newscms/2014_04/133241/candy-crush-saga-screenshot-01.jpg',
      'https://www.mobygames.com/images/shots/l/628983-candy-crush-saga-android-screenshot-the-chocolate-candy-covered.jpg',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKPaARKhM6RGzdTQi0YwqKHZmm_eNxUn2Emw&usqp=CAU'
    ],
    data: {
      url: 'https://svelte-candy-crush.vercel.app/',
      desc: 'Candy Crush Saga is a free-to-play match-three puzzle video game released by King on April 12, 2012,',
      feat: 'Candy beans.'
    }
  },
  {
    name: 'windows96',
    icon: 'https://i.redd.it/kksrotgwyya61.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://static.wikia.nocookie.net/windows/images/8/80/W98-2.png/revision/latest?cb=20191005212338',
      'https://www.extremetech.com/wp-content/uploads/2017/02/win98-640x353.jpg',
      'https://support.brother.com/g/b/img/faqend/faqh00000051_000/gb/en/5425/faqh000051_05.jpg'
    ],
    data: {
      url: 'https://windows96.net/',
      desc: 'Windows 96 recreation',
      feat: 'The os older then your mother.'
    }
  },
  {
    name: 'Python Compiler',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1200px-Python-logo-notext.svg.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://cdn.programiz.com/cdn/farfuture/IwFGGPqycIxTfzLl7mPdcaqUaircnStXfipaHd4EBik/mtime:1605833048/sites/all/themes/programiz/assets/compiler.png',
      'https://www.programiz.com/blog/content/images/2020/07/programiz-online-compiler.png'
    ],
    data: {
      url: 'https://www.programiz.com/python-programming/online-compiler/',
      desc: 'Compile Python'
    }
  },
  {
    name: 'MDown Editor',
    icon: 'https://github.com/RedEdge967/mdown-editor/raw/master/favicon.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://user-images.githubusercontent.com/91379432/155248594-05ffaa5e-29d4-4935-b681-ebdfd2ba8796.png'
    ],
    data: {
      url: 'https://rededge967.github.io/mdown-editor/',
      desc: 'A free open source markdown editor to play with codes',
      feat: 'A Markdown playground with a preview panel to play with codes written in JS, HTML5 and CSS3'
    }
  },
  {
    name: 'Google Cricket',
    icon: 'https://www.businessinsider.in/photo/75425726/how-to-play-cricket-on-google.jpg?imgsize=138543',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://www.businessinsider.in/photo/75425726/how-to-play-cricket-on-google.jpg?imgsize=138543',
      'https://www.google.com/logos/doodles/2017/icc-champions-trophy-2017-begins-5642111205507072.6-lawcta.gif',
      'https://i.ytimg.com/vi/Ud9Ts_NYAjQ/maxresdefault.jpg'
    ],
    data: {
      url: 'https://doodlecricket.github.io/#/',
      desc: 'Playing Cricket in online',
      feat: 'virtual cricket'
    }
  },
  {
    name: 'Excel',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Microsoft_Office_Excel_%282019%E2%80%93present%29.svg/826px-Microsoft_Office_Excel_%282019%E2%80%93present%29.svg.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://www.techrepublic.com/a/hub/i/r/2019/05/31/b9b3ae1d-6799-4118-8bcf-2bc3747c018f/resize/1200x/04c6599c3bc58330bd3350dd77984274/figure-b.jpg',
      'https://www.smartsheet.com/sites/default/files/IC-how-to-make-spreadsheet-11%20copy.jpg',
      'https://www.techrepublic.com/a/hub/i/r/2021/05/17/0fda89a7-51a1-4ef2-9c66-d492f21b4254/resize/1200x/89b7448d974ce30168eb278f5230b2a4/excel-spreadsheet.jpg'
    ],
    data: {
      url: 'https://win.asylum-os.com/data/excel.html',
      desc: 'Microsoft Excel is a spreadsheet developed by Microsoft for Windows, macOS, Android and iOS. It features calculation, graphing tools, pivot tables',
      feat: 'graphing tools'
    }
  },
  {
    name: 'Word',
    icon: 'https://raw.githubusercontent.com/win11react/store/main/store/img/word.svg',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4r1GB',
      'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4qsko',
      'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4qiBY'
    ],
    data: {
      url: 'https://win.asylum-os.com/data/word.html',
      desc: 'Microsoft Word is a word processing software developed by Microsoft. It was first released on October 25, 1983, under the name Multi-Tool Word for Xenix systems',
      feat: 'word processing'
    }
  },
  {
    name: 'PowerPoint',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Microsoft_Office_PowerPoint_%282019%E2%80%93present%29.svg/128px-Microsoft_Office_PowerPoint_%282019%E2%80%93present%29.svg.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://www.saashub.com/images/app/screenshots/153/i3djerzu0t57/landing-medium.jpg',
      'https://deckdeckgo.com/assets/meta/deckdeckgo-meta.png'
    ],
    data: {
      url: 'https://app.deckdeckgo.com',
      desc: 'DeckDeckGo is a slideshow creation app',
      feat: 'You can make slideshows'
    }
  },
  {
    name: 'Shell Shockers',
    icon: 'https://play-lh.googleusercontent.com/P-nde227L29s8w5U44kTPLiEnMEJUhJpEr4jL6tD6LV65Xz0JZtI4wEyFN-smsNrx-Q',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://images.crazygames.com/shellshockersio/20211202050253/shellshockersio-cover',
      'https://play-lh.googleusercontent.com/vL0-VAubTWhJs4buUsPBJmPPF3469eT45CdMIZZVEf54D-Ko_2uvxC4qZUD_LKuhnaw=w412-h220-rw',
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSeJNXXZ7sWn-5QK2_A5V9CHHaXR-fc6G7UBw&usqp=CAU'
    ],
    data: {
      url: 'https://eggcombat.com/',
      desc: '3D multiplayer egg-based shooter.',
      feat: 'Fried Eggs, Anyone?'
    }
  },
  {
    name: '2048',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/2048_logo.svg/100px-2048_logo.svg.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/2048_win.png/495px-2048_win.png',
      'https://i1.wp.com/itsfoss.com/wp-content/uploads/2018/07/play-2048-game-linux.jpeg',
      'https://elgoog.im/2048/2048-game.png'
    ],
    data: {
      url: 'https://glebbahmutov.com/2048/',
      desc: '2048 is a single-player sliding tile puzzle video game written by Italian web developer Gabriele Cirulli and published on GitHub.',
      feat: '1. Single player game.\n2. Genre: Puzzle'
    }
  },
  {
    name: 'Smash karts',
    icon: 'https://api.web.gamepix.com/assets/img/250/250/icon/smash-karts.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://static.gogy.com/ogimages/smashkarts-io.jpg',
      'https://yt3.ggpht.com/f4e3X0TDQ6edrwk29w6pBgxLdTnNUvZdBkDGDO0zqlWXY6NGVjdDvlTKhyg4apwjykBu-hSGuw=s900-c-k-c0x00ffffff-no-rj',
      'https://c.tenor.com/OOAB3Zw9lWsAAAAd/smash-karts-you-win.gif',
      'https://cdn.titotu.io/images/games/smash-karts-631x355.jpg'
    ],
    data: {
      url: 'https://smashkarts.io',
      desc: 'Smash Karts is a free io Multiplayer Kart Battle Arena game.\nIt is a three-dimensional multiplayer kart racing game. To win, you must drive your go-kart, pick up weaponry, and blow up other karts.',
      feat: 'Drive fast\nFire rockets\nMake big explosions'
    }
  },
  {
    name: 'Krunker',
    icon: 'https://krunker.io/img/newp.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://cdn.akamai.steamstatic.com/steam/apps/1408720/capsule_616x353.jpg',
      'https://i.redd.it/1oylfyu4giw21.png',
      'https://d326lupd521z61.cloudfront.net/uploads/webp/images/krunker-.io.webp',
      'https://www.mejoress.com/en/wp-content/uploads/Krunker-Aimbot-Hacks.jpg.webp'
    ],
    data: {
      url: 'https://krunker.io',
      desc: 'Krunker.io is a fast-paced pixelated first-person shooter.\nIn this browser game, players drop into a pixelated world and fight against other players from around the world',
      feat: 'Shooter Video Game\nBrowser game\nCasual game\nFree to Play'
    }
  },
  {
    name: 'Venge',
    icon: 'https://venge.io/favicon-96x96.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://images.crazygames.com/venge-io/20200822084809/venge-io-cover?auto=format,compress&q=75&cs=strip&ch=DPR&w=1200&h=630&fit=crop',
      'https://store-images.s-microsoft.com/image/apps.32319.13850149352717353.64fe5a9b-6264-4e33-9f7c-ca3337ddfe7e.6a702557-cb44-45b1-b415-58af9b7c71af?mode=scale&q=90&h=1080&w=1920',
      'https://store-images.s-microsoft.com/image/apps.39675.13850149352717353.64fe5a9b-6264-4e33-9f7c-ca3337ddfe7e.7ff6a76c-630a-4b2d-b86f-9cbd3953c853?w=672&h=378&q=80&mode=letterbox&background=%23FFE4E4E4&format=jpg',
      'https://pbs.twimg.com/media/E_XY7o8XEAknkKu.jpg'
    ],
    data: {
      url: 'https://venge.io/',
      desc: 'Venge is an objective-based first-person shooter. Every match is an intense unique experience with the ability cards that you can get in the game.',
      feat: ' Fast matches\nOnline community\nFirst person shoter'
    }
  },
  {
    name: 'JS Paint',
    icon: 'https://raw.githubusercontent.com/1j01/jspaint/master/images/icons/96x96.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://raw.githubusercontent.com/1j01/jspaint/master/images/meta/main-screenshot.png',
      'https://repository-images.githubusercontent.com/16602433/6d236580-dcad-11e9-8e28-516524888463',
      'https://ourcodeworld.com/public-media/articles/articleocw-5a6788d6906b2.png'
    ],
    data: {
      url: 'https://jspaint.app',
      desc: 'JS Paint is a web-based remake of MS Paint by Isaiah Odhner.\nThe goal is to remake MS Paint (including its little-known features), improve on it, and to extend the types of images it can edit. So far, it does this pretty well.',
      feat: 'Texture painting.\nDrag n drop.\nDigital Painting.\nKid friendly.\nBrowser based.\nWeb-Based.'
    }
  },
  {
    name: 'Soltaire',
    icon: 'https://images.all-free-download.com/images/graphiclarge/spider_solitaire_37215.jpg',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://www.freecell.io/uploads/games/icons/freecellio/spider-solitaire-windows-xp.jpg',
      'https://i.pinimg.com/originals/da/fb/51/dafb514c4185b9349a1ec3de54e2ae33.png',
      'https://upload.wikimedia.org/wikipedia/en/7/77/Spider_Solitaire_7.png'
    ],
    data: {
      url: 'https://www.squidbyte.com/games/spidersolitairewindowsxp',
      desc: 'Spider Solitaire is a solitaire card game. As of 2005, it was the most played game on Windows PCs, surpassing the shorter and less challenging Klondike-based Windows Solitaire.',
      feat: 'Play and win'
    }
  },
  {
    name: 'Doctor Strange : The Game',
    icon: 'https://github.com/RedEdge967/Doctor-Strange/raw/master/Doctor_Strange.png',
    type: 'app',
    size: 'maximize',
    gallery: ['https://github.com/win11React/store/blob/main/store/img/Capture.PNG?raw=true'],
    data: {
      url: 'https://rededge.is-a.dev/Doctor-Strange',
      desc: 'Fight monsters as Doctor Strange',
      feat: 'Fight monsters as, \n1. Doctor Strange\n2. Defender Strange\n3. Sinister Strange\n4. Supreme Strange\n5. Zombie Doctor Strange'
    }
  },
  {
    name: 'Super Mario Bros.',
    icon: 'https://icons.iconarchive.com/icons/ph03nyx/super-mario/128/Retro-Mario-icon.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Mario_Series_Logo.svg/1200px-Mario_Series_Logo.svg.png',
      'https://cdn.vox-cdn.com/thumbor/q86cfIgaaRxt7n5UG2iQEGx4Gls=/0x84:1024x767/1400x1050/filters:focal(0x84:1024x767):format(png)/cdn.vox-cdn.com/uploads/chorus_image/image/47185140/OZJlR3q.0.0.png',
      'https://i.ytimg.com/vi/cWOkHQXw0JQ/maxresdefault.jpg',
      'https://cdn.wionews.com/sites/default/files/styles/story_page/public/2020/10/02/162864-mario.jpg'
    ],
    data: {
      url: 'https://supermario-game.com/mario-game/mario.html',
      desc: ' Italian plumber Mario and his twin brother Luigi exterminate creatures emerging from the sewers by knocking them upside-down and kicking them away',
      feat: 'Mario Bros. is a 1983 platform game developed and published for arcades by Nintendo'
    }
  },
  {
    name: 'Stick Ninja',
    icon: 'https://github.com/RedEdge967/stick-ninja/raw/master/logo.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://user-images.githubusercontent.com/91379432/155825068-defa9420-344c-4d88-bae4-0962b039af8a.mp4'
    ],
    data: {
      url: 'https://rededge967.github.io/stick-ninja/',
      desc: 'A simple game to have some fun in the boring time',
      feat: 'A simple canvas ninja game written in html5, css3 and javascript to have some fun in the boring time which can run online same as offline also.'
    }
  },
  {
    name: 'Photopea',
    icon: 'https://raw.githubusercontent.com/cupofcoffebruh/Binbows11-copy/main/Icons/photopea%20(1).png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://lh3.googleusercontent.com/5WaMV4oSbcLQxOLsBKymdaprEij5t38HabZbqHFe2lLMatTjn3Av-Ewf3wv9NynaU2hahYh6FHNRkAMcjF29l2kWz9Y=w640-h400-e365-rj-sc0x00ffffff',
      'https://imag.malavida.com/mvimgbig/download-fs/photopea-27203-2.jpg',
      'https://user-images.githubusercontent.com/79121360/112741096-3d56bd00-8f37-11eb-982d-1866764e642c.png'
    ],
    data: {
      url: 'https://www.photopea.com/',
      desc: 'Photopea is a  Photo Editor lets you edit photos, apply effects, filters, add text, crop or resize pictures, it can used for complex projects or just some photos',
      feat: 'online foto editor easy to use great for anything you want'
    }
  },
  {
    name: 'Mortal Kombat Wiki',
    icon: 'https://upload.wikimedia.org/wikipedia/sco/thumb/b/b1/Mortal_Kombat_Logo.svg/1200px-Mortal_Kombat_Logo.svg.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://user-images.githubusercontent.com/91379432/163125734-be950688-534b-4280-96a6-994fd44d864b.PNG',
      'https://user-images.githubusercontent.com/91379432/163125779-f7055fdb-157d-48be-89d1-7479c265473a.PNG'
    ],
    data: {
      url: 'https://mk-wiki.vercel.app',
      desc: 'A Mortal Kombat based wiki',
      feat: 'A open source mortal kombat game based wiki'
    }
  },
  {
    name: 'HACKZILLA',
    icon: 'https://github.com/RedEdge967/HACKZILLA/raw/master/image-removebg-preview.png',
    type: 'app',
    size: 'maximize',
    gallery: ['https://github.com/RedEdge967/store/blob/main/store/img/HACKZILLA.png?raw=true'],
    data: {
      url: 'https://rededge.is-a.dev/HACKZILLA',
      desc: 'A name generator for everyone',
      feat: 'A name generator for everyone'
    }
  },
  {
    name: 'Adventures of Red',
    icon: 'https://github.com/RedEdge967/adventures-of-red/raw/master/Red%20player_stand.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://github.com/win11react/store/blob/main/store/img/adventures-of-red.PNG?raw=true'
    ],
    data: {
      url: 'https://rededge.is-a.dev/adventures-of-red',
      desc: 'A Platformer game',
      feat: 'A little platformer game where you have to collect 20 coins and defeat one enemy'
    }
  },
  {
    name: 'Wikipedia',
    icon: 'https://www.wikipedia.org/portal/wikipedia.org/assets/img/Wikipedia-logo-v2.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://wikipediaproject.yale.edu/sites/default/files/images/wikipedia-logo-.jpg',
      'https://upload.wikimedia.org/wikipedia/en/8/8e/EnglishWikipedia_29June2017.png',
      'https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2020/05/wikipedia-swastha-1588853853.jpg',
      'https://edtimes.in/wp-content/uploads/2020/08/wikipedia-india-money-min-768x511.jpg'
    ],
    data: {
      url: 'https://www.wikipedia.org',
      desc: 'Wikipedia is a free online encyclopedia, created and edited by volunteers around the world and hosted by the Wikimedia Foundation',
      feat: 'free information\nadd information\nedit information'
    }
  },
  {
    name: 'Othello',
    icon: 'https://dl.flathub.org/repo/appstream/x86_64/icons/128x128/org.gnome.Reversi.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://raw.githubusercontent.com/blueedgetechno/othello/master/img/view.png',
      'https://play-lh.googleusercontent.com/InYKAUUjV_I4TJLmmPBi1ystF55XJiQQ6tJiAJdcKkUl3OEdPjKo9P2ioceicWID3oU',
      'https://www.johnadams.co.uk/wp-content/uploads/2016/07/Othello__0001_9690_Othello_Product_2.png',
      'https://www.coolmathgames.com/sites/default/files/styles/blog_node_image/public/2020-07/how%20to%20play%20reversi%20thumb.jpg'
    ],
    data: {
      url: 'https://othello.blueedge.me',
      desc: 'Othello(Reversi) is a strategy board game for two players, played on an 8×8 uncheckered board. It was invented in 1883.',
      feat: 'Board game'
    }
  },
  {
    name: 'paper.io',
    icon: 'https://kevin.games/assets/images/games/paper-io-3d.jpg',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://cdn.titotu.io/images/games/paper-io-2-664x374.jpg',
      'https://media.pocketgamer.com/artwork/na-qhuif/paperio2.jpg',
      'https://www.touchtapplay.com/wp-content/uploads/2018/09/paper-io-2-cheats-tips-696x362.jpg',
      'https://img-hws.y8.com/cloud/v2-y8-thumbs-video-thumbnails-001/281885/video_thumbnail.jpg'
    ],
    data: {
      url: 'https://paper-io.com',
      desc: 'Paper.io 2 is a real-time multiplayer .io game where you have to capture as much territory as possible.\nPaint the map in your own color to take over the Paper.io world! Look out for other players vying to claim your space.',
      feat: 'Fight and capture'
    }
  },
  {
    name: 'Flappy bird',
    icon: 'https://upload.wikimedia.org/wikipedia/en/0/0a/Flappy_Bird_icon.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://static.keygames.com/2/113722/96298/672x448/flappybird-og.webp',
      'https://s18798.pcdn.co/shannonhu/wp-content/uploads/sites/19057/2020/10/flappy-bird.jpg',
      'https://blogs.manageengine.com/wp-content/uploads/2014/02/Flappy-Bird-Teaser.jpg',
      'https://www.gamerroof.com/wp-content/uploads/2019/05/Flappy-Bird-Full-Version-Free-Download.jpg'
    ],
    data: {
      url: 'https://playcanv.as/p/2OlkUaxF',
      desc: 'Flappy Bird is a game developed by Vietnamese video game artist and programmer Dong Nguyen, under his game development company .Gears. The game is a side-scroller where the player controls a bird, attempting to fly between columns of green pipes without hitting them.',
      feat: 'fly, dodge, score'
    }
  },
  {
    name: 'HexGL',
    icon: 'https://hexgl.bkcore.com/image.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://lh6.ggpht.com/XHZFQMr3IcrX2LEDvxG6olkEVZXrHUS6Qn7LXxPlZkRLTOIMIU1ndoaTc3meZUepka5COLXL7zoS1KqC0uo0IrRaZnUEUd2qTbg'
    ],
    data: {
      url: 'https://hexgl.bkcore.com/play/',
      desc: 'HexGL is a futuristic, fast-paced racing game built by Thibaut Despoulain using HTML5, Javascript and WebGL and a tribute to the original Wipeout and F-Zero series.',
      feat: ''
    }
  },
  {
    name: 'X Trench Run',
    icon: 'https://gameforge.com/de-DE/littlegames/includes/images/games/7057_5eb3e9a3795fd.jpg',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://i.ytimg.com/vi/R0zAkJMbTpU/mqdefault.jpg',
      'https://image.yaksgames.com/v2/game/4/1/b/jBaV0W2p2DZLJHp72OSYPNqeYlIOru3QNbcYIj51.jpeg',
      'https://avatars.mds.yandex.net/get-games/1881364/2a0000016ce14641340667b8d7ad3a2eb747/default526x314'
    ],
    data: {
      url: 'https://d2yh0uqycmhzn9.cloudfront.net/en/x-trench-run/index.html?token=hc8j1DOq1591613358sfaNwz7pYSNRJcAg',
      desc: 'Shoot down turrets as you fly through the trench avoiding any and all obstacles in this epic 3D space flying game.',
      feat: 'A cool game'
    }
  },
  {
    name: 'osu!',
    icon: 'https://i.ibb.co/k6GWsJn/download.jpg',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://gamefaqs.gamespot.com/a/screen/full/4/0/0/919400.jpg',
      'https://i.ibb.co/xhfLhWs/Screenshot-2022-01-16-2-16-18-PM.png',
      'https://www.taminggaming.com/cms/graphics/screen_shot_3459.jpeg'
    ],
    data: {
      url: 'https://webosu.online/',
      desc: 'osu!, is a fun free-to-play rhythm game',
      feat: 'fun game with alot of beatmaps'
    }
  },
  {
    name: 'Dash Clicker',
    icon: 'https://i.ibb.co/bBh4kYJ/71b457bd-14f4-4768-b34b-c9097fc94ad8.jpg',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://raw.githubusercontent.com/armn/Dashclicker/master/src/assets/images/screenshot.png',
      'https://preview.redd.it/qq3wou3zpcp71.png?width=1366&format=png&auto=webp&s=418ba40fba2f64f5b5ab84be23fdbfec86749528',
      'https://i.redd.it/xnrak7gpfds31.png'
    ],
    data: {
      url: 'https://dashclicker.com/',
      desc: 'A clicker game for nerds',
      feat: 'A clicker game for nerds'
    }
  },
  {
    name: 'Spider Man',
    icon: 'https://raw.githubusercontent.com/RedEdge967/Spider-Man/master/images/spider-head.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://user-images.githubusercontent.com/91379432/155486365-0e2b515d-d90d-4846-aecf-f41b6e307429.png'
    ],
    data: {
      url: 'https://rededge967.github.io/Spider-Man',
      desc: 'Your friendly neighbourhood Spiderman ...',
      feat: '1. Jump and shoot.\n2. Fight Villains'
    }
  },
  {
    name: 'Keyboard Hero',
    icon: 'https://www.iconpacks.net/icons/1/free-keyboard-icon-1425-thumb.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://user-images.githubusercontent.com/91379432/147643717-5d033687-bed2-4be4-8bc4-80dca284746d.PNG'
    ],
    data: {
      url: 'https://rededge967.github.io/Keyboard-Hero/',
      desc: 'A free typing improving software for everyone',
      feat: 'A free and open source typing improving software for everyone'
    }
  },
  {
    name: 'Space Shooter',
    icon: 'https://bk.ibxk.com.br/2018/1/programas/15961511160455574.png',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://raw.githubusercontent.com/RedEdge967/store/main/store/img/space-shooter.PNG'
    ],
    data: {
      url: 'https://react-shooter.vercel.app',
      desc: 'A shooting game to have some fun alone',
      feat: 'A shooting game to have some fun alone.\n1. Use arrows to move\n2. Press space to shoot'
    }
  },
  {
    name: 'Connect Four',
    icon: 'https://github.com/RedEdge967/connect-four/raw/master/Logo.png',
    type: 'app',
    size: 'maximize',
    gallery: ['https://github.com/RedEdge967/store/blob/main/store/img/connect4.PNG?raw=true'],
    data: {
      url: 'https://rededge.is-a.dev/connect-four',
      desc: 'Classic connect four game in html',
      feat: 'Classic connect four game in html, css and javascript'
    }
  },
  {
    name: '@CChrome',
    icon: 'https://cdn-icons-png.flaticon.com/512/311/311333.png',
    type: 'app',
    size: 'maximize',
    gallery: [''],
    data: {
      url: 'https://cherrychrome.neocities.org/',
      desc: 'Get more search results!',
      feat: "This 'browser' is a collection of others mixed together so you get more results"
    }
  },
  {
    name: 'Scratch',
    icon: 'https://llk.github.io/scratch-gui/master/static/favicon.ico',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQoPckz603CcUVyrUwDAX04l7OXMpKZQXI4QUr9P5_UMas37EMmrSUNn9JgK5Yzz0R8Kw&usqp=CAU',
      'https://www.researchgate.net/profile/Robert-Morris-5/publication/228389474/figure/fig2/AS:393642368880642@1470863062228/A-screenshot-of-the-Scratch-programming-blocks.png',
      'https://techcrunch.com/wp-content/uploads/2019/01/ProjectEditor.png?w=430&h=230&crop=1'
    ],
    data: {
      url: 'https://llk.github.io/scratch-gui/master/',
      desc: 'Scratch is a high-level block-based visual programming language and website targeted primarily at children 8–16 as an educational tool for programming. ',
      feat: 'Users on the site, called Scratchers, can create projects on the website using a block-like interface.'
    }
  },
  {
    name: 'Pulsus',
    icon: 'https://th.bing.com/th/id/OIP.tR1V8Bl79cmxdD3APZF8AAHaHa?pid=ImgDet&rs=1',
    type: 'app',
    size: 'maximize',
    gallery: ['https://th.bing.com/th/id/OIP.XJJOW9JnXQiUMVnxB1IVkwHaF4?pid=ImgDet&rs=1'],
    data: {
      url: 'https://www.pulsus.cc/play',
      desc: 'Pulsus is a brand new rhythm game, that you can play in your browser!',
      feat: 'Never seen gameplay style - Play with your numpad.'
    }
  },
  {
    name: 'Bemuse',
    icon: 'https://github.com/DJMakerMusician/win11inreactappstore/blob/9aec0169dff6407980b41a4ef95f87082b4a6689/store/img/bemuse.png',
    type: 'app',
    size: 'maximize',
    gallery: ['http://bemuse.ninja/res/og-image.png'],
    data: {
      url: 'https://bemuse.ninja',
      desc: 'Bemuse is web-based rhythm game.',
      feat: '2 Gamemodes - Play with KEYBOARD or BMS CONTROLLER'
    }
  },
  {
    name: 'Taiko',
    icon: 'https://github.com/DJMakerMusician/win11inreactappstore/blob/f232d61ae7bb2e23fc284b11ddaf1916a0b128a3/store/img/taiko.png',
    type: 'app',
    size: 'maximize',
    gallery: ['https://i.ytimg.com/vi/mx90x5wsDT0/hqdefault.jpg'],
    data: {
      url: 'https://https://taiko.bui.pm/',
      desc: 'Taiko is one of the most iconic rhythm games, you can find. Play NOW, and become a drummer TODAY!',
      feat: 'Play simply with your keyboard, or connect a drum controller!'
    }
  },
  {
    name: 'iPadOS VM (alpha)',
    icon: 'https://th.bing.com/th/id/R.b1648f8218f3bdf5187d0a6a5dba37ef?rik=wFM5MUrRORTC%2fA&pid=ImgRaw&r=0',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://th.bing.com/th/id/R.b1648f8218f3bdf5187d0a6a5dba37ef?rik=wFM5MUrRORTC%2fA&pid=ImgRaw&r=0'
    ],
    data: {
      url: 'https://goldengocoding.github.io/iPadOS-in-HTML/',
      desc: 'iPadOS in HTML!!',
      feat: 'Run iPadOS in Windows 11'
    }
  },
  {
    name: 'windows 11 Inception',
    icon: 'https://images.tokopedia.net/img/cache/500-square/VqbcmM/2022/1/29/ad18df0f-bee3-4b8a-9806-ff32ba2e0754.jpg.webp?ect=4g',
    type: 'app',
    size: 'maximize',
    gallery: [
      'https://news.microsoft.com/wp-content/uploads/prod/sites/454/2021/10/Hero-Bloom-Logo-800x533-1.jpg'
    ],
    data: {
      url: 'https://win11.blueedge.me',
      desc: 'Virtual Machine...',
      feat: 'Inception'
    }
  }
];

export default defaultApps;
