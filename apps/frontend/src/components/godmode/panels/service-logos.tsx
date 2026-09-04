// Icons for the provider/service choices in godmode (email, SMS,
// integrations). Brand marks are sourced from svgl.app and official
// press kits; Console and SMTP aren't brands, so they keep plain Lucide
// icons. Klipy has no vector mark available, its raster logo sits on an
// always-white chip so it stays legible in dark mode too.
//
// Infobip's own "-dark" (near-black ink) asset only has contrast on a
// light background, and its "-light" (brand orange) asset is the one
// that actually shows up on a dark background, so the light/dark UI
// mapping below is the opposite of Infobip's own filenames.
import type { ComponentType } from 'react';
import { Mail, Terminal } from 'lucide-react';
import { imgChipIcon, rawSvgIcon, themedSvgIcon, type LogoProps } from '../svg-icon';

const ConsoleLogo: ComponentType<LogoProps> = ({ className, size = 18 }) => (
  <Terminal className={className} size={size} strokeWidth={2.25} />
);
const SmtpLogo: ComponentType<LogoProps> = ({ className, size = 18 }) => (
  <Mail className={className} size={size} strokeWidth={2.25} />
);

const resendLogo = themedSvgIcon(`<svg width="1800" height="1800" viewBox="0 0 1800 1800" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1000.46 450C1174.77 450 1278.43 553.669 1278.43 691.282C1278.43 828.896 1174.77 932.563 1000.46 932.563H912.382L1350 1350H1040.82L707.794 1033.48C683.944 1011.47 672.936 985.781 672.935 963.765C672.935 932.572 694.959 905.049 737.161 893.122L908.712 847.244C973.85 829.812 1018.81 779.353 1018.81 713.298C1018.8 632.567 952.745 585.78 871.095 585.78H450V450H1000.46Z" fill="black"/>
</svg>`, `<svg width="1800" height="1800" viewBox="0 0 1800 1800" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1000.46 450C1174.77 450 1278.43 553.669 1278.43 691.282C1278.43 828.896 1174.77 932.563 1000.46 932.563H912.382L1350 1350H1040.82L707.794 1033.48C683.944 1011.47 672.936 985.781 672.935 963.765C672.935 932.572 694.959 905.049 737.161 893.122L908.712 847.244C973.85 829.812 1018.81 779.353 1018.81 713.298C1018.8 632.567 952.745 585.78 871.095 585.78H450V450H1000.46Z" fill="#FDFDFD"/>
</svg>`);
const awsLogo = themedSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" x="0" y="0" viewBox="0 0 304 182"><path fill="#252f3e" d="m86 66 2 9c0 3 1 5 3 8v2l-1 3-7 4-2 1-3-1-4-5-3-6c-8 9-18 14-29 14-9 0-16-3-20-8-5-4-8-11-8-19s3-15 9-20c6-6 14-8 25-8a79 79 0 0 1 22 3v-7c0-8-2-13-5-16-3-4-8-5-16-5l-11 1a80 80 0 0 0-14 5h-2c-1 0-2-1-2-3v-5l1-3c0-1 1-2 3-2l12-5 16-2c12 0 20 3 26 8 5 6 8 14 8 25v32zM46 82l10-2c4-1 7-4 10-7l3-6 1-9v-4a84 84 0 0 0-19-2c-6 0-11 1-15 4-3 2-4 6-4 11s1 8 3 11c3 2 6 4 11 4zm80 10-4-1-2-3-23-78-1-4 2-2h10l4 1 2 4 17 66 15-66 2-4 4-1h8l4 1 2 4 16 67 17-67 2-4 4-1h9c2 0 3 1 3 2v2l-1 2-24 78-2 4-4 1h-9l-4-1-1-4-16-65-15 64-2 4-4 1h-9zm129 3a66 66 0 0 1-27-6l-3-3-1-2v-5c0-2 1-3 2-3h2l3 1a54 54 0 0 0 23 5c6 0 11-2 14-4 4-2 5-5 5-9l-2-7-10-5-15-5c-7-2-13-6-16-10a24 24 0 0 1 5-34l10-5a44 44 0 0 1 20-2 110 110 0 0 1 12 3l4 2 3 2 1 4v4c0 3-1 4-2 4l-4-2c-6-2-12-3-19-3-6 0-11 0-14 2s-4 5-4 9c0 3 1 5 3 7s5 4 11 6l14 4c7 3 12 6 15 10s5 9 5 14l-3 12-7 8c-3 3-7 5-11 6l-14 2z"/><path d="M274 144A220 220 0 0 1 4 124c-4-3-1-6 2-4a300 300 0 0 0 263 16c5-2 10 4 5 8z" fill="#f90"/><path d="M287 128c-4-5-28-3-38-1-4 0-4-3-1-5 19-13 50-9 53-5 4 5-1 36-18 51-3 2-6 1-5-2 5-10 13-33 9-38z" fill="#f90"/></svg>`, `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" x="0" y="0" viewBox="0 0 304 182"><path fill="#ffffff" d="m86 66 2 9c0 3 1 5 3 8v2l-1 3-7 4-2 1-3-1-4-5-3-6c-8 9-18 14-29 14-9 0-16-3-20-8-5-4-8-11-8-19s3-15 9-20c6-6 14-8 25-8a79 79 0 0 1 22 3v-7c0-8-2-13-5-16-3-4-8-5-16-5l-11 1a80 80 0 0 0-14 5h-2c-1 0-2-1-2-3v-5l1-3c0-1 1-2 3-2l12-5 16-2c12 0 20 3 26 8 5 6 8 14 8 25v32zM46 82l10-2c4-1 7-4 10-7l3-6 1-9v-4a84 84 0 0 0-19-2c-6 0-11 1-15 4-3 2-4 6-4 11s1 8 3 11c3 2 6 4 11 4zm80 10-4-1-2-3-23-78-1-4 2-2h10l4 1 2 4 17 66 15-66 2-4 4-1h8l4 1 2 4 16 67 17-67 2-4 4-1h9c2 0 3 1 3 2v2l-1 2-24 78-2 4-4 1h-9l-4-1-1-4-16-65-15 64-2 4-4 1h-9zm129 3a66 66 0 0 1-27-6l-3-3-1-2v-5c0-2 1-3 2-3h2l3 1a54 54 0 0 0 23 5c6 0 11-2 14-4 4-2 5-5 5-9l-2-7-10-5-15-5c-7-2-13-6-16-10a24 24 0 0 1 5-34l10-5a44 44 0 0 1 20-2 110 110 0 0 1 12 3l4 2 3 2 1 4v4c0 3-1 4-2 4l-4-2c-6-2-12-3-19-3-6 0-11 0-14 2s-4 5-4 9c0 3 1 5 3 7s5 4 11 6l14 4c7 3 12 6 15 10s5 9 5 14l-3 12-7 8c-3 3-7 5-11 6l-14 2z"/><path d="M274 144A220 220 0 0 1 4 124c-4-3-1-6 2-4a300 300 0 0 0 263 16c5-2 10 4 5 8z" fill="#f90"/><path d="M287 128c-4-5-28-3-38-1-4 0-4-3-1-5 19-13 50-9 53-5 4 5-1 36-18 51-3 2-6 1-5-2 5-10 13-33 9-38z" fill="#f90"/></svg>`);
const twilioLogo = rawSvgIcon(`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64"><g transform="translate(0 .047) scale(.93704)" fill="#e31e26"><path d="M34.1 0C15.3 0 0 15.3 0 34.1s15.3 34.1 34.1 34.1C53 68.3 68.3 53 68.3 34.1S53 0 34.1 0zm0 59.3C20.3 59.3 9 48 9 34.1 9 20.3 20.3 9 34.1 9 48 9 59.3 20.3 59.3 34.1 59.3 48 48 59.3 34.1 59.3z"/><circle cx="42.6" cy="25.6" r="7.1"/><circle cx="42.6" cy="42.6" r="7.1"/><circle cx="25.6" cy="42.6" r="7.1"/><circle cx="25.6" cy="25.6" r="7.1"/></g></svg>`);
const vonageLogo = themedSvgIcon(`<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 75.5 65.8" style="enable-background:new 0 0 75.5 65.8;" xml:space="preserve">
 <g fill="#000000">
  <path d="M14.9,0H0l21.3,48.3c0.2,0.4,0.7,0.4,0.8,0l7.1-16.6L14.9,0z">
  </path>
  <path d="M60.4,0c0,0-22.9,52.4-25.9,57.2c-3.6,5.6-5.9,7.8-10.3,8.4c0,0-0.1,0-0.1,0.1c0,0,0,0.1,0.1,0.1h13.7
		c5.9,0,10.2-4.9,12.6-9.3C53.1,51.5,75.5,0,75.5,0H60.4z">
  </path>
 </g>
</svg>`, `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 75.5 65.8" style="enable-background:new 0 0 75.5 65.8;" xml:space="preserve">
 <g fill="#ffffff">
  <path d="M14.9,0H0l21.3,48.3c0.2,0.4,0.7,0.4,0.8,0l7.1-16.6L14.9,0z">
  </path>
  <path d="M60.4,0c0,0-22.9,52.4-25.9,57.2c-3.6,5.6-5.9,7.8-10.3,8.4c0,0-0.1,0-0.1,0.1c0,0,0,0.1,0.1,0.1h13.7
		c5.9,0,10.2-4.9,12.6-9.3C53.1,51.5,75.5,0,75.5,0H60.4z">
  </path>
 </g>
</svg>`);
const infobipLogo = themedSvgIcon(`<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" viewBox="0 0 500 500" xmlns:xlink="http://www.w3.org/1999/xlink">
 <path fill="#201d1d" d="M321.58 321.58c-13.68 13.67-40.42 21.81-71.56 21.81s-57.91-8.14-71.55-21.81-21.86-40.42-21.86-71.58 8.19-57.87 21.86-71.55 40.42-21.86 71.55-21.86 57.88 8.18 71.56 21.86 21.81 40.42 21.81 71.55-8.18 57.9-21.81 71.58zM375 250a125 125 0 1 0-125 125 125 125 0 0 0 125-125z">
 </path>
 <path fill="#201d1d" d="M274.12 232.52v34.19a7.1 7.1 0 0 1-7.08 7.12h-34.23a7.09 7.09 0 0 1-7.08-7.12v-34.19a7.09 7.09 0 0 1 7.08-7.12H267a7.1 7.1 0 0 1 7.12 7.12z">
 </path>
 <path fill="#201d1d" d="M308.52 191c-9.69-9.69-32.69-16-58.61-16s-48.92 6.27-58.61 16-15.95 32.72-15.95 58.65 6.22 49 15.95 58.65 32.69 16 58.61 16 48.92-6.27 58.61-16 16-32.73 16-58.65-6.27-49-16-58.65zm-22.64 94.38c-2 2-8.18 8.18-36.14 8.18s-34.15-6.14-36.14-8.18-8.18-8.18-8.18-36.14 6.14-34.11 8.18-36.14 8.14-8.14 36.14-8.14 34.11 6.1 36.14 8.14 8.14 8.18 8.14 36.14-6.14 34.08-8.14 36.11z">
 </path>
</svg>`, `<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" viewBox="0 0 500 500" xmlns:xlink="http://www.w3.org/1999/xlink">
 <path fill="#ff5a00" d="M321.58 321.58c-13.68 13.67-40.42 21.81-71.56 21.81s-57.91-8.14-71.55-21.81-21.86-40.42-21.86-71.58 8.19-57.87 21.86-71.55 40.42-21.86 71.55-21.86 57.88 8.18 71.56 21.86 21.81 40.42 21.81 71.55-8.18 57.9-21.81 71.58zM375 250a125 125 0 1 0-125 125 125 125 0 0 0 125-125z">
 </path>
 <path fill="#ff5a00" d="M274.12 232.52v34.19a7.1 7.1 0 0 1-7.08 7.12h-34.23a7.09 7.09 0 0 1-7.08-7.12v-34.19a7.09 7.09 0 0 1 7.08-7.12H267a7.1 7.1 0 0 1 7.12 7.12z">
 </path>
 <path fill="#ff5a00" d="M308.52 191c-9.69-9.69-32.69-16-58.61-16s-48.92 6.27-58.61 16-15.95 32.72-15.95 58.65 6.22 49 15.95 58.65 32.69 16 58.61 16 48.92-6.27 58.61-16 16-32.73 16-58.65-6.27-49-16-58.65zm-22.64 94.38c-2 2-8.18 8.18-36.14 8.18s-34.15-6.14-36.14-8.18-8.18-8.18-8.18-36.14 6.14-34.11 8.18-36.14 8.14-8.14 36.14-8.14 34.11 6.1 36.14 8.14 8.14 8.18 8.14 36.14-6.14 34.08-8.14 36.11z">
 </path>
</svg>`);
const sinchLogo = themedSvgIcon(`<svg version="1.1" id="Layer_1" xmlns:x="ns_extend;" xmlns:i="ns_ai;" xmlns:graph="ns_graphs;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 93.4 49.8" style="enable-background:new 0 0 93.4 49.8;" xml:space="preserve">
 <metadata>
  <sfw xmlns="ns_sfw;">
   <slices>
   </slices>
   <sliceSourceBounds bottomLeftOrigin="true" height="49.8" width="93.4" x="-154.4" y="51.4">
   </sliceSourceBounds>
  </sfw>
 </metadata>
 <g>
  <path d="M90.3,15.8c-2.1-2.9-5-5.2-8.3-6.4c-2.2-0.8-4.5-1.2-6.8-1.2c-4,0-8.3,1.3-12.4,3.7L26.7,33c-5.6,3.3-9.8,2.8-12.3,1.9
		c-1.9-0.7-3.4-1.9-4.6-3.5C8.7,29.8,8.1,27.9,8,26c0-2,0.6-3.9,1.7-5.5c1.1-1.6,2.7-2.8,4.5-3.5c2.5-1,6.7-1.5,12.3,1.7l4.1,2.3
		c-0.2,0.8-0.4,1.7-0.5,2.5l-0.2,1.6L60.7,7.4l0.1,0c0.8-0.6,1.4-1.4,1.6-2.4c0.2-1,0-2-0.5-2.9c-0.5-0.9-1.3-1.5-2.3-1.8
		c-1-0.3-2-0.2-2.9,0.2l0,0l-10,5.8L36.6,0.4l-0.1,0c-0.9-0.4-2-0.5-2.9-0.2c-1,0.3-1.8,1-2.3,1.8c-0.5,0.9-0.6,1.9-0.4,2.9
		c0.2,1,0.8,1.8,1.7,2.4l6.2,3.5l-0.9,0.5l0,0c-1.2,0.8-2.3,1.7-3.3,2.7l-4.1-2.3C24,8,17.2,7.2,11.3,9.5c-2.4,0.9-4.7,2.4-6.5,4.3
		c-1.8,1.9-3.2,4.2-4,6.7c-1.4,4.4-1.1,9,0.9,13.1c2,4.1,5.5,7.2,9.8,8.8c2.2,0.8,4.5,1.2,6.8,1.2c4,0,8.3-1.3,12.4-3.7l0.1,0
		l36-21.1c5.6-3.3,9.8-2.8,12.3-1.9c1.9,0.7,3.4,1.9,4.6,3.5c1.1,1.6,1.7,3.5,1.7,5.5c0,1-0.2,2.1-0.5,3c-0.5,1.3-1.2,2.6-2.2,3.6
		c-1,1-2.2,1.8-3.5,2.3c-2.5,1-6.7,1.5-12.3-1.7l-4.1-2.3c0.3-0.9,0.4-1.8,0.6-2.7l0.2-1.6l-24,14v9.3l16-9.3l0,0
		c1.2-0.8,2.3-1.7,3.3-2.7l4.1,2.3c6.6,3.7,13.4,4.5,19.2,2.3c3.4-1.3,6.2-3.5,8.3-6.5c2-3,3.1-6.4,3.1-10h0
		C93.4,22.2,92.3,18.7,90.3,15.8L90.3,15.8z">
  </path>
 </g>
</svg>`, `<svg version="1.1" id="Layer_1" xmlns:x="ns_extend;" xmlns:i="ns_ai;" xmlns:graph="ns_graphs;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 93.4 49.8" style="enable-background:new 0 0 93.4 49.8;" xml:space="preserve">
 <g>
  <path fill="#FFFFFF" d="M90.3,15.8c-2.1-2.9-5-5.2-8.3-6.4c-2.2-0.8-4.5-1.2-6.8-1.2c-4,0-8.3,1.3-12.4,3.7L26.7,33
		c-5.6,3.3-9.8,2.8-12.3,1.9c-1.9-0.7-3.4-1.9-4.6-3.5C8.7,29.8,8.1,27.9,8,26c0-2,0.6-3.9,1.7-5.5c1.1-1.6,2.7-2.8,4.5-3.5
		c2.5-1,6.7-1.5,12.3,1.7l4.1,2.3c-0.2,0.8-0.4,1.7-0.5,2.5l-0.2,1.6L60.7,7.4l0.1,0c0.8-0.6,1.4-1.4,1.6-2.4c0.2-1,0-2-0.5-2.9
		c-0.5-0.9-1.3-1.5-2.3-1.8c-1-0.3-2-0.2-2.9,0.2l0,0l-10,5.8L36.6,0.4l-0.1,0c-0.9-0.4-2-0.5-2.9-0.2c-1,0.3-1.8,1-2.3,1.8
		c-0.5,0.9-0.6,1.9-0.4,2.9c0.2,1,0.8,1.8,1.7,2.4l6.2,3.5l-0.9,0.5l0,0c-1.2,0.8-2.3,1.7-3.3,2.7l-4.1-2.3C24,8,17.2,7.2,11.3,9.5
		c-2.4,0.9-4.7,2.4-6.5,4.3c-1.8,1.9-3.2,4.2-4,6.7c-1.4,4.4-1.1,9,0.9,13.1c2,4.1,5.5,7.2,9.8,8.8c2.2,0.8,4.5,1.2,6.8,1.2
		c4,0,8.3-1.3,12.4-3.7l0.1,0l36-21.1c5.6-3.3,9.8-2.8,12.3-1.9c1.9,0.7,3.4,1.9,4.6,3.5c1.1,1.6,1.7,3.5,1.7,5.5c0,1-0.2,2.1-0.5,3
		c-0.5,1.3-1.2,2.6-2.2,3.6c-1,1-2.2,1.8-3.5,2.3c-2.5,1-6.7,1.5-12.3-1.7l-4.1-2.3c0.3-0.9,0.4-1.8,0.6-2.7l0.2-1.6l-24,14v9.3
		l16-9.3l0,0c1.2-0.8,2.3-1.7,3.3-2.7l4.1,2.3c6.6,3.7,13.4,4.5,19.2,2.3c3.4-1.3,6.2-3.5,8.3-6.5c2-3,3.1-6.4,3.1-10h0
		C93.4,22.2,92.3,18.7,90.3,15.8L90.3,15.8z">
  </path>
 </g>
</svg>`);
const messagebirdLogo = themedSvgIcon(`<svg version="1.1" id="Layer_1" xmlns:x="ns_extend;" xmlns:i="ns_ai;" xmlns:graph="ns_graphs;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 164.5 138" style="enable-background:new 0 0 164.5 138;" xml:space="preserve">
 <g>
  <path fill="#2481D7" d="M147.6,24.6c-6.6,0-12.5,3.3-16.1,8.3l-24.3,34c-0.9,1.3-2.4,2.1-4,2.1c-2.7,0-4.9-2.2-4.9-4.9
		c0-1,0.3-2,0.8-2.7l20.5-30.7c2.1-3.1,3.3-6.9,3.3-11c0-10.9-8.8-19.7-19.7-19.7H0v19.7h88.4c0,5.4-4.4,9.9-9.9,9.9H0
		c0,7,1.5,13.7,4.1,19.7h64.5c0,5.4-4.4,9.9-9.9,9.9H9.9c9,12,23.3,19.7,39.5,19.7h24.3c2.7,0,4.9,2.2,4.9,4.9
		c0,2.7-2.2,4.9-4.9,4.9H49.3l-33,49.3H76c27.3,0,50.5-17.8,58.6-42.4l11.1-33.7c3.6-10.9,10.2-20.5,18.8-27.8
		C161.1,28.4,154.8,24.6,147.6,24.6z M147.6,38.1c-2,0-3.7-1.7-3.7-3.7s1.7-3.7,3.7-3.7s3.7,1.7,3.7,3.7
		C151.3,36.5,149.6,38.1,147.6,38.1z">
  </path>
 </g>
</svg>`, `<svg version="1.1" id="Layer_1" xmlns:x="ns_extend;" xmlns:i="ns_ai;" xmlns:graph="ns_graphs;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 164.5 138" style="enable-background:new 0 0 164.5 138;" xml:space="preserve">
 <g>
  <path fill="#FFFFFF" d="M147.6,24.6c-6.6,0-12.5,3.3-16.1,8.3l-24.3,34c-0.9,1.3-2.4,2.1-4,2.1c-2.7,0-4.9-2.2-4.9-4.9
		c0-1,0.3-2,0.8-2.7l20.5-30.7c2.1-3.1,3.3-6.9,3.3-11c0-10.9-8.8-19.7-19.7-19.7H0v19.7h88.4c0,5.4-4.4,9.9-9.9,9.9H0
		c0,7,1.5,13.7,4.1,19.7h64.5c0,5.4-4.4,9.9-9.9,9.9H9.9c9,12,23.3,19.7,39.5,19.7h24.3c2.7,0,4.9,2.2,4.9,4.9
		c0,2.7-2.2,4.9-4.9,4.9H49.3l-33,49.3H76c27.3,0,50.5-17.8,58.6-42.4l11.1-33.7c3.6-10.9,10.2-20.5,18.8-27.8
		C161.1,28.4,154.8,24.6,147.6,24.6z M147.6,38.1c-2,0-3.7-1.7-3.7-3.7s1.7-3.7,3.7-3.7s3.7,1.7,3.7,3.7
		C151.3,36.5,149.6,38.1,147.6,38.1z">
  </path>
 </g>
</svg>`);
const n8nLogo = rawSvgIcon(`<svg width="228" height="120" viewBox="0 0 228 120" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M204 48C192.817 48 183.42 40.3514 180.756 30H153.248C147.382 30 142.376 34.241 141.412 40.0272L140.425 45.9456C139.489 51.5648 136.646 56.4554 132.626 60C136.646 63.5446 139.489 68.4352 140.425 74.0544L141.412 79.9728C142.376 85.759 147.382 90 153.248 90H156.756C159.42 79.6486 168.817 72 180 72C193.255 72 204 82.7452 204 96C204 109.255 193.255 120 180 120C168.817 120 159.42 112.351 156.756 102H153.248C141.516 102 131.504 93.5181 129.575 81.9456L128.588 76.0272C127.624 70.241 122.618 66 116.752 66H107.244C104.58 76.3514 95.183 84 84 84C72.817 84 63.4204 76.3514 60.7561 66H47.2439C44.5796 76.3514 35.183 84 24 84C10.7452 84 0 73.2548 0 60C0 46.7452 10.7452 36 24 36C35.183 36 44.5796 43.6486 47.2439 54H60.7561C63.4204 43.6486 72.817 36 84 36C95.183 36 104.58 43.6486 107.244 54H116.752C122.618 54 127.624 49.759 128.588 43.9728L129.575 38.0544C131.504 26.4819 141.516 18 153.248 18L180.756 18C183.42 7.64864 192.817 0 204 0C217.255 0 228 10.7452 228 24C228 37.2548 217.255 48 204 48ZM204 36C210.627 36 216 30.6274 216 24C216 17.3726 210.627 12 204 12C197.373 12 192 17.3726 192 24C192 30.6274 197.373 36 204 36ZM24 72C30.6274 72 36 66.6274 36 60C36 53.3726 30.6274 48 24 48C17.3726 48 12 53.3726 12 60C12 66.6274 17.3726 72 24 72ZM96 60C96 66.6274 90.6274 72 84 72C77.3726 72 72 66.6274 72 60C72 53.3726 77.3726 48 84 48C90.6274 48 96 53.3726 96 60ZM192 96C192 102.627 186.627 108 180 108C173.373 108 168 102.627 168 96C168 89.3726 173.373 84 180 84C186.627 84 192 89.3726 192 96Z" fill="#ea4b71"/></svg>`);
const klipyLogo = imgChipIcon('data:image/png;base64,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');

export const EMAIL_PROVIDER_LOGOS: Record<string, ComponentType<LogoProps>> = {
  console: ConsoleLogo,
  smtp: SmtpLogo,
  resend: resendLogo,
  ses: awsLogo,
};

export const SMS_PROVIDER_LOGOS: Record<string, ComponentType<LogoProps>> = {
  console: ConsoleLogo,
  twilio: twilioLogo,
  vonage: vonageLogo,
  infobip: infobipLogo,
  sinch: sinchLogo,
  messagebird: messagebirdLogo,
};

export const INTEGRATION_LOGOS: Record<string, ComponentType<LogoProps>> = {
  n8n: n8nLogo,
  klipy: klipyLogo,
};
