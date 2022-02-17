import { spawnSync } from "child_process";
import * as fs from "fs";
import fetch from "cross-fetch";
// import * as say from "say";
import JSZip from "jszip";

// var zip = new JSZip();
// zip.file("Hello.txt", "Hello World\n");
// var img = zip.folder("images");
// img.file("smile.gif", imgData, {base64: true});
// zip.generateAsync({type:"blob"})
// .then(function(content) {
//     // see FileSaver.js
//     saveAs(content, "example.zip");
// });

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createZipForStudio(path: string, output: string) {
  var zip = new JSZip();
  var zipAsset = zip.folder("assets");

  let dir = fs.opendirSync(path + "/assets");
  let d: fs.Dirent = undefined;
  while ((d = dir.readSync())) {
    console.log(`${path} assets/  - ${d.name}`);
    let filePath = `${path}assets/${d.name}`;
    let buff = fs.readFileSync(filePath);
    zipAsset.file(`${d.name}`, buff);
  }

  zip.file(`thumbnail.jpg`, fs.readFileSync(path + "thumbnail.png"));
  zip.file(`story.json`, fs.readFileSync(`${path}story.json`));

  let zipFile = await zip.generateAsync({ type: "nodebuffer" });
  let dst = fs.createWriteStream(output);
  dst.write(zipFile);

  dir.close();
  dst.close();
}

/**
 * Creates an image compatible with Lunii
 * @param path location where image will be saved
 * @param text text to put the image
 */
export function createLuniiImage(path: string, text: string) {
  let stext = text.replace(/"/g, '\\"');
  let k = spawnSync(
    `convert`,
    [
      `-size 320x240 -background black`,
      `-font Courier-bold -gravity center`,
      `+repage -strip -depth 4 -type palette`,
      `-alpha off +profile '!exif,*'`,
      `-fill white`,
      `caption:"${stext}"`,
      path
    ],
    { shell: true }
  );
  if (!!k.stderr.toString()) console.log(k.stderr.toString());
}

/**
 * Convert mp3 to be mono
 * @param input input mp3 location
 * @param output sanitized mp3 location
 * @param temp temp location
 */
export function sanitizeMP3(
  input: string,
  output: string,
  temp: string = undefined,
  log: boolean = false
) {
  if (!temp) temp = input + "tmp";

  // Converting mp3 to mono
  let p = spawnSync(
    "ffmpeg",
    [
      `-y`,
      `-i ${input}`, // input file
      "-ar 44100",
      "-ac 1",
      // `-map 0 -map_metadata 0:s:0`,
      "-acodec libmp3lame",
      `${temp}` // output file
    ],
    { shell: true }
  );
  if (log && !!p.stderr.toString()) console.log(p.stderr.toString());

  // Extracting images from mp3 id3 if any
  let i = spawnSync(
    "ffmpeg",
    [`-y`, `-i ${input}`, "-an", "-vcodec copy", `${output}-mp3.png`],
    { shell: true }
  );
  if (log && !!i.stderr.toString()) console.log(i.stderr.toString());

  // Removing images from mp3
  let j = spawnSync(
    "ffmpeg",
    [
      `-y`,
      `-i ${temp}`,
      "-map 0:a -codec:a copy -map_metadata -1",
      `${output}`
    ],
    { shell: true }
  );
  if (log && !!j.stderr.toString()) console.log(j.stderr.toString());

  fs.unlink(`${temp}`, (err) => (!!err ? console.log(err) : undefined));
  fs.unlink(input, (err) => (!!err ? console.log(err) : undefined)); // removing working file.
}

/**
 * Returns the filename from a full path
 * @param path path to retrieve the filename from
 */
export function getFileName(path: string): string {
  return path.split("/")[path.split("/").length - 1];
}

/**
 * Download a TTS mp3 from a text
 * @param path location to save the TTS output
 * @param text text to TTS
 */
export async function downloadTTSVoice(path: string, text: string) {
  let sanitizedText = text.replace(/\//g, " sur ");
  let ttsPath = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURI(
    sanitizedText
  )}&tl=fr&total=1&idx=0&textlen=${encodeURI(sanitizedText).length}`;
  await downloadToFile(ttsPath, path);
}

/**
 * Generate a wav from
 * @param path location to save the TTS output
 * @param text text to speach
 */
export async function exportTTSVoice(path: string, text: string) {
  let params = [
    "-vAudrey",
    "--file-format=AIFF",
    // "--data-format=LEF32@22050",
    `-o ${path.replace(".mp3", ".aiff")}`,
    `${text
      .replace(/'/g, "\\'")
      .replace(/[\(\)]/g, "")
      .replace(/\//g, " sur ")}`
  ];
  let s = spawnSync("say", params, { shell: true });
  let err = s.stderr.toString();

  console.log(!!err ? [err, params, path, text] : "");
  let t = spawnSync(
    "ffmpeg",
    [
      `-y`,
      `-i ${path.replace(".mp3", ".aiff")}`, // input file
      "-ar 44100",
      "-ac 1",
      // `-map 0 -map_metadata 0:s:0`,
      "-acodec libmp3lame",
      `${path}` // output file
    ],
    { shell: true }
  );
  // ffmpeg -i myinput.aif -f mp3 -acodec libmp3lame -ab 320000 -ar 44100 myoutput.mp3

  fs.unlink(`${path.replace(".mp3", ".aiff")}`, (err) =>
    !!err ? console.log(err) : undefined
  );

  // console.log(`=> ${path}: ${text}`);

  // say.export(text, "Audrey", 1, path + "tmp", (error) => {
  //   if (error) return console.log(error);
  //   sanitizeMP3(path + "tmp.mp3", path, path + "tmp2.mp3");
  // });
}

/**
 * Download a file to a local location
 * @param url location of the document to download
 * @param output location to save the output
 */
export async function downloadToFile(url: string, output: string) {
  try {
    let dst = fs.createWriteStream(output);
    let buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
    await dst.write(buffer);
    dst.close();
  } catch (err) {
    console.log(err);
  }
}

/**
 * Sanitize a text to be compatible with a local save
 * @param text text to sanitize
 * @param supplemental additional parameters
 */
export function sanitizeFileName(
  text: string,
  ...supplemental: string[]
): string {
  let stext = text
    .concat(supplemental.join())
    .replace(/[^0-9a-zA-Z]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  // stext = stext;
  return stext;
}

// import { spawnSync } from "child_process";
// import * as fs from "fs";
// import fetch from "cross-fetch";

// /**
//  * Creates an image compatible with Lunii
//  * @param path location where image will be saved
//  * @param text text to put the image
//  */
// export function createLuniiImage(path: string, text: string) {
//   let k = spawnSync(
//     "convert",
//     [
//       `-size 320x240 -background black`,
//       `-font Courier-bold -gravity center`,
//       `+repage -strip -depth 4 -type palette`,
//       `-alpha off +profile '!exif,*'`,
//       `-fill white`,
//       `caption:"${text.replace('"', '\\"')}"`,
//       path
//     ],
//     { shell: true }
//   );
//   console.log(k.stderr.toString());
// }

// /**
//  * Returns the filename from a full path
//  * @param path path to retrieve the filename from
//  */
// export function getFileName(path: string): string {
//   return path.split("/")[path.split("/").length - 1];
// }

// /**
//  * Download a TTS mp3 from a text
//  * @param path location to save the TTS output
//  * @param text text to TTS
//  */
// export async function downloadTTSVoice(path: string, text: string) {
//   let sanitizedText = text.replace(/\//g, " sur ");
//   let ttsPath = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURI(
//     sanitizedText
//   )}&tl=fr&total=1&idx=0&textlen=${encodeURI(sanitizedText).length}`;
//   await downloadToFile(ttsPath, path);
// }

// /**
//  * Download a file to a local location
//  * @param url location of the document to download
//  * @param output location to save the output
//  */
// export async function downloadToFile(url: string, output: string) {
//   try {
//     let dst = fs.createWriteStream(output);
//     let res = await fetch(url, {
//       method: "GET",
//       headers: {
//         "User-Agent":
//           "Mozilla/5.0 (Linux; Android 8.1.0; U70C Build/OPM2.171019.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/96.0.4664.104 Mobile Safari/537.36 GSA/12.48.23.23.arm64"
//       }
//     });
//     if (url.indexOf(".mp3") > 0) console.log(output);
//     //   console.log(`URL : ${url}`, res.status, res.headers);
//     // console.log(res);
//     let buffer = Buffer.from(await res.arrayBuffer());

//     // console.log(buffer);

//     // let buffer = await (await fetch(url)).buffer();
//     console.log(dst.write(buffer));
//     dst.close();
//   } catch (err) {
//     console.log(err);
//   }
// }

// /**
//  * Sanitize a text to be compatible with a local save
//  * @param text text to sanitize
//  * @param supplemental additional parameters
//  */
// export function sanitizeFileName(
//   text: string,
//   ...supplemental: string[]
// ): string {
//   let stext = text
//     .concat(supplemental.join())
//     .replace(/[ ()\.\/\[\]\\#\+\=\$\@\!\%\^\&\*\-\_\?\<\>\,\.\:\;\'\"]/g, "")
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "");
//   // stext = stext;
//   return stext;
// }
