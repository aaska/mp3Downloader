import * as process from "process";
import { spawnSync } from "child_process";
import { StudioBuilder } from "./StudioBuilder";
import { exit } from "process";
import {
  createLuniiImage,
  createZipForStudio,
  downloadToFile,
  downloadTTSVoice,
  exportTTSVoice,
  sanitizeFileName,
  sanitizeMP3,
  sleep
} from "./utils/utils";
import * as fs from "fs";

/**
 * @savedPath global var that setup the local folder where all documents will be created
 * on MacOS it will be /Users/<current user>/mp3Downloader/
 */
export const savedPath = process.env.HOME + "/mp3Downloader/";
// export const assetPath = `${savedPath}assets/`;
const temp = "/tmp";
export interface IMP3List {
  title: string;
  url: string;
  filename: string;
  voicePath: string;
  imagePath: string;
  storyPath: string;
  path: string;
}

function checkAndCreateDirectory(path: string) {
  if (!fs.existsSync(path)) {
    try {
      fs.mkdirSync(path);
    } catch (err) {
      console.log(`unable to create directory : ${path}`, err);
      exit(-1);
    }
  }
}

async function fetchMp3(source: IMP3List[], useItunesImages: boolean = false) {
  for (let s of source) {
    let split = s.url.split(".");
    s.filename = sanitizeFileName(s.title) + "." + split[split.length - 1];

    checkAndCreateDirectory(`${s.path}`);

    let baseName = `${s.path}${s.filename.split(".")[0]}`;

    let localPath = `${s.path}raw-${s.filename}`;
    s.storyPath = `${baseName}.mp3`;
    let tempPath = `${baseName}-tmp.mp3`;
    s.voicePath = `${baseName}-voice.mp3`;
    s.imagePath = `${baseName}.png`;

    exportTTSVoice(s.voicePath, s.title);
    createLuniiImage(s.imagePath, s.title);
    if (fs.existsSync(s.storyPath)) {
      console.log(`File exist, skipping - ${s.storyPath}`);
      continue;
    }
    // await downloadTTSVoice(s.voicePath, s.title);
    // exportTTSVoice(s.voicePath, s.title);
    // Creating node image with ImageMagick
    createLuniiImage(s.imagePath, s.title);
    console.log(`[${s.title}] - fetching ${s.filename}`);
    await downloadToFile(s.url, localPath);

    sanitizeMP3(localPath, s.storyPath, tempPath);
    // // Converting mp3 to mono
    // let p = spawnSync(
    //   "ffmpeg",
    //   [
    //     `-y`,
    //     `-i ${localPath}`, // input file
    //     "-ar 44100",
    //     "-ac 1",
    //     // `-map 0 -map_metadata 0:s:0`,
    //     "-acodec libmp3lame",
    //     `${tempPath}` // output file
    //   ],
    //   { shell: true }
    // );
    // // if (!!p.stderr.toString()) console.log(p.stderr.toString());

    // // Extracting images from mp3 id3 if any
    // let i = spawnSync(
    //   "ffmpeg",
    //   [
    //     `-y`,
    //     `-i ${localPath}`,
    //     "-an",
    //     "-vcodec copy",
    //     `${s.storyPath}-mp3.png`
    //   ],
    //   { shell: true }
    // );
    // // if (!!i.stderr.toString()) console.log(i.stderr.toString());

    // // Removing images from mp3
    // let j = spawnSync(
    //   "ffmpeg",
    //   [
    //     `-y`,
    //     `-i ${tempPath}`,
    //     "-map 0:a -codec:a copy -map_metadata -1",
    //     `${s.storyPath}`
    //   ],
    //   { shell: true }
    // );
    // // if (!!j.stderr.toString()) console.log(j.stderr.toString());

    // fs.unlink(`${tempPath}`, (err) => (!!err ? console.log(err) : undefined));
    // fs.unlink(localPath, (err) => (!!err ? console.log(err) : undefined)); // removing working file.
  }
}

export interface IFeedInformation {
  title?: string;
  description?: string;
  image?: { link?: string; title?: string; url?: string };
  link?: string;
  feedUrl?: string;
}

async function getRss(url: string) {
  let Parser = require("rss-parser");
  let parser = new Parser();
  let mp3list: IMP3List[] = [];

  let feed = await parser.parseURL(url);
  let info: IFeedInformation = {
    description: feed.description,
    feedUrl: feed.feedUrl,
    image: feed.image,
    link: feed.link,
    title: feed.title
  };

  const recordingPath = savedPath + sanitizeFileName(info.title) + "/";
  checkAndCreateDirectory(recordingPath);
  checkAndCreateDirectory(recordingPath + "assets/");

  if (!!info.image && info.image.url) {
    await downloadToFile(info.image.url, recordingPath + "cover.jpeg");
    let c = spawnSync(
      "convert",
      [`${recordingPath}cover.jpeg`, `${recordingPath}thumbnail.png`],
      { shell: true }
    );
    fs.unlink(`${recordingPath}cover.jpeg`, (err) =>
      !!err ? console.log(err) : undefined
    );
  }

  let cntItunesImageDiff: number = 0;
  let lastImage: string = "";
  // let useItunesImages = false;
  let ou = 0;
  feed.items.forEach((i: any) => {
    ou++;
    // if (ou > 1) return;
    if (!!i.itunes && !!i.itunes.image) {
      // console.log(i.itunes.image, lastImage);
      if (lastImage !== i.itunes.image) {
        cntItunesImageDiff++;
        lastImage = i.itunes.image;
      }
    }
    mp3list.push({
      title: i.title,
      url: i.enclosure.url,
      filename: "",
      imagePath: "",
      storyPath: "",
      voicePath: "",
      path: recordingPath + "assets/"
    });
  });

  // console.log(cntItunesImageDiff);
  await fetchMp3(mp3list, cntItunesImageDiff > 1);
  let sb = new StudioBuilder(info, recordingPath);
  await sb.createStory(mp3list);
  console.log("5 seconds sleep");
  await sleep(5000);
  await createZipForStudio(
    recordingPath,
    savedPath + sanitizeFileName(info.title) + ".zip"
  );
  console.log("Pack created");
}

async function listener(e: any) {
  let entry: String = e.toString().trim();
  let args = entry.split(" ");
  let value = e.toString().trim();

  console.log(`[${value}]`);

  try {
    await getRss(value);
  } catch (err) {
    console.log(err);
  }
}

/**
 * Creates the directory where all stories and images will be stored
 */
checkAndCreateDirectory(savedPath);

console.log("Enter RSS URL : ");
// say.speak("Kikou lol", "Amelie");
// say.speak("Kikou lol", "Audrey");
let stdin = process.openStdin();
stdin.addListener("data", listener);
