export interface IPosition {
  x: number;
  y: number;
}

export interface IOkTransition {
  actionNode: string;
  optionIndex: number;
}

export interface IHomeTransition {
  actionNode: string;
  optionIndex: number;
}

export interface IControlSettings {
  wheel: boolean;
  ok: boolean;
  home: boolean;
  pause: boolean;
  autoplay: boolean;
}

export enum EnumStageType {
  COVER = "cover",
  STORY = "story",
  MENU_QUESTION = "menu.questionstage",
  MENU_OPTION = "menu.optionstage"
}

export enum EnumActionType {
  MENU_QUESTION = "menu.questionaction",
  MENU_OPTION = "menu.optionsaction",
  STORY_ACTION = "story.storyaction"
}

export interface IStageNode {
  uuid: string;
  type: EnumStageType;
  name: string;
  position: IPosition;
  image?: any;
  audio: string;
  okTransition: IOkTransition;
  homeTransition: IHomeTransition;
  controlSettings: IControlSettings;
  squareOne?: boolean;
  groupId?: string;
}

export interface IActionNode {
  id: string;
  type: EnumActionType;
  groupId: string;
  name: string;
  position: IPosition;
  options: string[];
}

export interface IRootObject {
  format: string;
  title: string;
  version: number;
  description: string;
  stageNodes: IStageNode[];
  actionNodes: IActionNode[];
}
