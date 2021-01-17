import {
  EnumActionType,
  EnumStageType,
  IActionNode,
  IRootObject,
  IStageNode
} from "./lunii";
import { IMP3List, savedPath } from "./index";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";

export class StudioBuilder {
  private actions: IActionNode[] = [];
  private stages: IStageNode[] = [];
  private root: IRootObject;

  constructor(list: IMP3List[]) {
    this.root = {
      version: 1,
      description: "",
      format: "v1",
      title: "imported from mp3downloader",
      stageNodes: this.stages,
      actionNodes: this.actions
    };
    // Entry point
    this.stages[0] = this.createStageNode("", "cover", EnumStageType.COVER);
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
    this.stages[1] = this.createStageNode(
      "",
      "Menu node",
      EnumStageType.MENU_QUESTION
    );
    let groupId = uuidv4();
    this.stages[1].groupId = groupId;
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
    this.actions[0].groupId = groupId;
    this.actions[0].options = [this.stages[1].uuid];
    this.stages[0].okTransition.actionNode = this.actions[0].id;

    let optionsList: string[] = [];
    for (let i = 0; i < list.length; i++) {
      let story = this.createStageNode(
        list[i].storyPath.split("/")[list[i].storyPath.split("/").length - 1],
        list[i].title,
        EnumStageType.STORY
      );
      story.controlSettings = {
        wheel: false,
        ok: false,
        autoplay: true,
        home: true,
        pause: true
      };
      story.image = null;
      story.okTransition.actionNode = this.actions[0].id;
      story.homeTransition.actionNode = this.actions[0].id;
      // story.position = null;
      let menuOption = this.createStageNode(
        list[i].voicePath.split("/")[list[i].voicePath.split("/").length - 1],
        list[i].title,
        EnumStageType.MENU_OPTION
      );
      menuOption.controlSettings = {
        wheel: true,
        ok: true,
        home: true,
        pause: false,
        autoplay: false
      };
      menuOption.image = list[i].imagePath.split("/")[
        list[i].imagePath.split("/").length - 1
      ];
      menuOption.audio = list[i].voicePath.split("/")[
        list[i].voicePath.split("/").length - 1
      ];
      menuOption.groupId = groupId;
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
    menuActions.groupId = groupId;
    menuActions.options = optionsList;
    this.actions.push(menuActions);
    this.writeAssetJson();
  }

  private writeAssetJson() {
    fs.writeFile(
      `${savedPath}story.json`,
      JSON.stringify(this.root),
      "utf8",
      (err) => console.log(err)
    );
  }

  private createActionNode(type: EnumActionType): IActionNode {
    let id = uuidv4();
    let action: IActionNode = {
      groupId: "",
      id: id,
      name: type.toString(),
      options: [],
      position: { x: 10, y: 10 },
      type
    };
    return action;
  }

  private createStageNode(
    audio: string,
    name: string,
    type: EnumStageType
  ): IStageNode {
    let stage: IStageNode = {
      uuid: uuidv4(),
      type,
      name,
      position: { x: 10, y: 10 },
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
      stage.position = null;
    }
    if (type === EnumStageType.MENU_QUESTION) stage.position = undefined;
    return stage;
  }
}
