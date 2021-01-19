import * as process from "process";
import { spawnSync } from "child_process";
import { StudioBuilder } from "./StudioBuilder";
import { exit } from "process";
import {
  createLuniiImage,
  downloadToFile,
  downloadTTSVoice,
  sanitizeFileName
} from "./utils/utils";
import * as fs from "fs";

export const savedPath = process.env.HOME + "/mp3Downloader/"; // Change here for folder you want to save
export const assetPath = `${savedPath}assets/`;
const temp = "/tmp";
export interface IMP3List {
  title: string;
  url: string;
  filename: string;
  voicePath: string;
  imagePath: string;
  storyPath: string;
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

async function fetchMp3(source: IMP3List[]) {
  for (let s of source) {
    let split = s.url.split(".");
    s.filename = sanitizeFileName(s.title) + "." + split[split.length - 1];

    checkAndCreateDirectory(`${assetPath}`);

    let baseName = `${assetPath}${s.filename.split(".")[0]}`;

    let localPath = `${savedPath}raw-${s.filename}`;
    s.storyPath = `${baseName}.mp3`;
    let tempPath = `${baseName}-tmp.mp3`;
    s.voicePath = `${baseName}-voice.mp3`;
    s.imagePath = `${baseName}.png`;

    if (fs.existsSync(s.storyPath)) {
      console.log(`File exist, skipping - ${s.storyPath}`);
      continue;
    }
    await downloadTTSVoice(s.voicePath, s.title);
    // Creating node image with ImageMagick
    createLuniiImage(s.imagePath, s.title);
    await downloadToFile(s.url, localPath);

    console.log(`[${s.title}] - fetching ${s.filename}`);

    // Converting mp3 to mono
    let p = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${localPath}`, // input file
        "-ar 44100",
        "-ac 1",
        // `-map 0 -map_metadata 0:s:0`,
        "-acodec libmp3lame",
        `${tempPath}` // output file
      ],
      { shell: true }
    );

    // Extracting images from mp3 id3 if any
    let i = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${localPath}`,
        "-an",
        "-vcodec copy",
        `${s.storyPath}-mp3.png`
      ],
      { shell: true }
    );

    // Removing images from mp3
    let j = spawnSync(
      "ffmpeg",
      [
        `-y`,
        `-i ${tempPath}`,
        "-map 0:a -codec:a copy -map_metadata -1",
        `${s.storyPath}`
      ],
      { shell: true }
    );

    fs.unlink(`${tempPath}`, (err) => console.log(err));
    fs.unlink(localPath, (err) => console.log(err)); // removing working file.
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

  if (!!info.image && info.image.url)
    await downloadToFile(info.image.url, savedPath + "cover.jpeg");

  feed.items.forEach((i) => {
    mp3list.push({
      title: i.title,
      url: i.enclosure.url,
      filename: "",
      imagePath: "",
      storyPath: "",
      voicePath: ""
    });
  });

  await fetchMp3(mp3list);
  let sb = new StudioBuilder(info);
  await sb.createStory(mp3list);
  console.log("Pack created");
}

async function listener(e: any) {
  let entry: String = e.toString().trim();
  let args = entry.split(" ");
  let value = e.toString().trim();

  console.log(`[${value}]`);

  await getRss(value);
}

checkAndCreateDirectory(savedPath);

console.log("Enter RSS URL : ");
let stdin = process.openStdin();
stdin.addListener("data", listener);
