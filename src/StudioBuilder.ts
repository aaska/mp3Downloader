import {
  EnumActionType,
  EnumStageType,
  IActionNode,
  IRootObject,
  IStageNode
} from "./lunii";
import { assetPath, IFeedInformation, IMP3List, savedPath } from "./index";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  createLuniiImage,
  downloadTTSVoice,
  getFileName,
  sanitizeFileName
} from "./utils/utils";

export class StudioBuilder {
  private actions: IActionNode[] = [];
  private stages: IStageNode[] = [];
  private root: IRootObject;

  constructor(
    // list: IMP3List[],
    info: IFeedInformation
  ) {
    this.root = {
      version: 1,
      description: info.description ?? "",
      format: "v1",
      title: info.title ?? "imported from mp3Downloader",
      stageNodes: this.stages,
      actionNodes: this.actions
    };
  }

  private writeAssetJson() {
    fs.writeFile(
      `${savedPath}story.json`,
      JSON.stringify(this.root),
      "utf8",
      (err) => console.log(err)
    );
  }

  private createActionNode(
    type: EnumActionType,
    level: { levelHorizontal: number; levelVertical: number } = {
      levelHorizontal: 1,
      levelVertical: 1
    }
  ): IActionNode {
    let id = uuidv4();
    let action: IActionNode = {
      groupId: "",
      id: id,
      name: type.toString(),
      options: [],
      position: {
        x: level.levelHorizontal * 350,
        y: level.levelVertical * 350
      },
      type
    };
    return action;
  }

  private createStageNode(
    audio: string,
    name: string,
    type: EnumStageType,
    level: { levelHorizontal: number; levelVertical: number } = {
      levelHorizontal: 1,
      levelVertical: 1
    }
  ): IStageNode {
    let stage: IStageNode = {
      uuid: uuidv4(),
      type,
      name,
      position: {
        x: level.levelHorizontal * 350,
        y: level.levelVertical * 350
      },
      image: null,
      audio,
      okTransition: { actionNode: "", optionIndex: 0 },
      homeTransition: { actionNode: "", optionIndex: 0 },
      controlSettings: {
        autoplay: false,
        home: false,
        ok: false,
        pause: false,
        wheel: false
      }
    };
    if (type === EnumStageType.COVER) stage.squareOne = true;
    if (type === EnumStageType.STORY) {
      stage.groupId = stage.uuid;
      // stage.position = null;
    }
    if (type === EnumStageType.MENU_QUESTION) stage.position = undefined;
    return stage;
  }

  private async initRootStory(): Promise<string> {
    // Entry point
    let audioCover = assetPath + sanitizeFileName(this.root.title) + ".mp3";
    await downloadTTSVoice(audioCover, this.root.title);
    createLuniiImage(audioCover + ".png", this.root.title);
    this.stages[0] = this.createStageNode(
      getFileName(audioCover),
      "cover",
      EnumStageType.COVER,
      { levelHorizontal: 1, levelVertical: 1 }
    );
    this.stages[0].image = getFileName(audioCover) + ".png";
    this.stages[0].squareOne = true;
    this.stages[0].homeTransition = null;
    this.stages[0].controlSettings = {
      autoplay: false,
      home: false,
      pause: false,
      ok: true,
      wheel: true
    };
    // Main Menu
    let audioMenu = assetPath + "chooseStoryPack" + ".mp3";
    await downloadTTSVoice(audioMenu, "Choisi un Pack ou une histoire");
    this.stages[1] = this.createStageNode(
      getFileName(audioMenu),
      "Menu node",
      EnumStageType.MENU_QUESTION,
      { levelHorizontal: 2, levelVertical: 1 }
    );
    let mainGroupId = uuidv4();
    this.stages[1].groupId = mainGroupId;
    this.stages[1].controlSettings = {
      autoplay: true,
      home: false,
      pause: false,
      ok: false,
      wheel: false
    };
    this.stages[1].homeTransition = null;

    // Linking Cover node to Menu Node
    this.actions[0] = this.createActionNode(EnumActionType.MENU_QUESTION);
    this.actions[0].groupId = mainGroupId;
    this.actions[0].options = [this.stages[1].uuid];
    this.stages[0].okTransition.actionNode = this.actions[0].id;
    let menuAction = this.createActionNode(EnumActionType.MENU_OPTION);
    menuAction.groupId = mainGroupId;
    menuAction.options = [];
    this.stages[1].okTransition = {
      actionNode: menuAction.id,
      optionIndex: 0
    };
    this.actions.push(menuAction);
    return mainGroupId;
  }

  private async createSubMenu(
    name: string,
    idx: number = 1
  ): Promise<IStageNode> {
    let audio = assetPath + "chooseStory" + ".mp3";
    await downloadTTSVoice(audio, "Choisi une histoire");
    let menuPack = this.createStageNode(
      getFileName(audio),
      name,
      EnumStageType.MENU_QUESTION,
      {
        levelHorizontal: 3,
        levelVertical: idx
      }
    );
    menuPack.groupId = uuidv4();
    menuPack.controlSettings = {
      autoplay: true,
      home: false,
      pause: false,
      ok: false,
      wheel: false
    };
    menuPack.homeTransition = null;

    return menuPack;
  }

  private async linkCurrentPackToParentPack(
    currentPack: IStageNode,
    parentPack: IStageNode,
    name: string
  ): Promise<IActionNode> {
    // MenuOption is for parent Pack to link to this new MenuPack
    let audioOption = assetPath + sanitizeFileName(name) + ".mp3";
    await downloadTTSVoice(audioOption, name);
    createLuniiImage(audioOption + ".png", name);
    let menuOption = this.createStageNode(
      getFileName(audioOption),
      name,
      EnumStageType.MENU_OPTION
    );
    menuOption.image = getFileName(audioOption) + ".png";
    menuOption.controlSettings = {
      wheel: true,
      ok: true,
      home: true,
      pause: false,
      autoplay: false
    };
    menuOption.groupId = parentPack.groupId;
    menuOption.homeTransition = undefined;
    menuOption.position = undefined;
    let okAction = this.createActionNode(EnumActionType.MENU_QUESTION);
    okAction.options = [currentPack.uuid];
    okAction.groupId = currentPack.groupId;
    menuOption.okTransition = {
      actionNode: okAction.id,
      optionIndex: 0
    };

    this.actions[1].options.push(menuOption.uuid);

    this.stages.push(menuOption, currentPack);
    this.actions.push(okAction);
    return okAction;
  }

  public async createStory(list: IMP3List[], maxStoryPerPack: number = 10) {
    let mainGroupId = await this.initRootStory();

    //// Create the number of menus based on the number of stories in the list

    for (let i = 0; i < list.length / maxStoryPerPack; i++) {
      //TODO: Enable generating imanges
      //TODO: Enable generating audio cue
      //TODD: Handle Position
      let menuPack = await this.createSubMenu(`Pack ${i + 1}`);
      let menuPackACtion = await this.linkCurrentPackToParentPack(
        menuPack,
        this.stages[1],
        `Pack ${i + 1}`
      );
      let optionsList: string[] = [];
      for (
        let y = i * maxStoryPerPack;
        y < (i + 1) * maxStoryPerPack && y < list.length;
        y++
      ) {
        // console.log(`${y} - ${i}`);
        let story = this.createStageNode(
          getFileName(list[y].storyPath),
          list[y].title,
          EnumStageType.STORY,
          {
            levelHorizontal: 4,
            levelVertical: y
          }
        );
        story.controlSettings = {
          wheel: false,
          ok: false,
          autoplay: true,
          home: true,
          pause: true
        };
        story.image = null;
        story.okTransition.actionNode = menuPackACtion.id;
        story.homeTransition.actionNode = menuPackACtion.id;
        let menuOption = this.createStageNode(
          getFileName(list[y].voicePath),
          list[y].title,
          EnumStageType.MENU_OPTION
        );
        menuOption.controlSettings = {
          wheel: true,
          ok: true,
          home: true,
          pause: false,
          autoplay: false
        };
        menuOption.image = getFileName(list[y].imagePath);
        menuOption.audio = getFileName(list[y].voicePath);
        menuOption.groupId = menuPack.groupId;
        menuOption.homeTransition = undefined;
        menuOption.position = undefined;

        let okAction = this.createActionNode(EnumActionType.STORY_ACTION);
        okAction.groupId = story.uuid;
        okAction.options = [story.uuid];
        menuOption.okTransition = {
          actionNode: okAction.id,
          optionIndex: 0
        };

        optionsList.push(menuOption.uuid);
        this.stages.push(story, menuOption);
        this.actions.push(okAction);
      }

      let menuActions = this.createActionNode(EnumActionType.MENU_OPTION);
      menuActions.groupId = menuPack.groupId;
      menuActions.options = optionsList;
      menuPack.okTransition = {
        actionNode: menuActions.id,
        optionIndex: 0
      };
      this.actions.push(menuActions);
    }

    this.writeAssetJson();
  }
}
