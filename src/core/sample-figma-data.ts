import type {
  GetFileResponse,
  GetFileVersionsResponse,
} from "./figma-api";

type FigmaNode = Record<string, unknown>;

const fileBase = {
  name: "AgentReach Website & Web app",
  role: "owner",
  editorType: "figma",
  components: {},
  componentSets: {},
  schemaVersion: 0,
  styles: {},
} satisfies Partial<GetFileResponse>;

const websitePage: FigmaNode = {
  id: "0:1",
  name: "Website",
  type: "CANVAS",
  scrollBehavior: "SCROLLS",
  children: [],
};

const registrationExistingFrame: FigmaNode = {
  id: "4569:10000",
  name: "Registration overview",
  type: "FRAME",
  scrollBehavior: "SCROLLS",
  absoluteBoundingBox: {
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
  },
  children: [],
};

const registrationAddedFrame: FigmaNode = {
  id: "5646:20208",
  name: "DTP - Registration - Create office agent account",
  type: "FRAME",
  scrollBehavior: "SCROLLS",
  absoluteBoundingBox: {
    x: 1600,
    y: 0,
    width: 1440,
    height: 900,
  },
  children: [],
};

const receivingFrameBefore: FigmaNode = {
  id: "4780:383317",
  name: "Screenshot 2026-05-18 at 16.31.14 1",
  type: "FRAME",
  scrollBehavior: "SCROLLS",
  absoluteBoundingBox: {
    x: -412,
    y: -65378,
    width: 685,
    height: 538,
  },
  children: [],
};

const receivingFrameAfter: FigmaNode = {
  ...receivingFrameBefore,
  absoluteBoundingBox: {
    x: 16738,
    y: -65378,
    width: 685,
    height: 538,
  },
};

export const sampleOlderFile = {
  ...fileBase,
  version: "2366075322438973666",
  lastModified: "2026-06-17T15:05:36Z",
  document: {
    id: "0:0",
    name: "Document",
    type: "DOCUMENT",
    scrollBehavior: "SCROLLS",
    children: [
      websitePage,
      {
        id: "4569:347315",
        name: "Office Agent Portal - Registration | Onboarding | Contact",
        type: "CANVAS",
        scrollBehavior: "SCROLLS",
        children: [registrationExistingFrame],
      },
      {
        id: "4235:262745",
        name: "Receiving",
        type: "CANVAS",
        scrollBehavior: "SCROLLS",
        children: [receivingFrameBefore],
      },
    ],
  },
} as GetFileResponse;

export const sampleCurrentFile = {
  ...fileBase,
  version: "2369347764861345445",
  lastModified: "2026-06-26T11:08:50Z",
  document: {
    id: "0:0",
    name: "Document",
    type: "DOCUMENT",
    scrollBehavior: "SCROLLS",
    children: [
      websitePage,
      {
        id: "4569:347315",
        name: "Office Agent Portal - Registration | Onboarding | Contact",
        type: "CANVAS",
        scrollBehavior: "SCROLLS",
        children: [registrationExistingFrame, registrationAddedFrame],
      },
      {
        id: "4235:262745",
        name: "Receiving",
        type: "CANVAS",
        scrollBehavior: "SCROLLS",
        children: [receivingFrameAfter],
      },
    ],
  },
} as GetFileResponse;

export const sampleVersions = {
  versions: [
    {
      id: "2369347764861345445",
      created_at: "2026-06-26T10:41:23Z",
      label: null,
      description: null,
      user: {
        handle: "Eurlich Allan",
        img_url: "",
        id: "617230080296806206",
      },
      thumbnail_url: "",
    },
    {
      id: "2366075322438973666",
      created_at: "2026-06-17T15:05:36Z",
      label: null,
      description: null,
      user: {
        handle: "Eurlich Allan",
        img_url: "",
        id: "617230080296806206",
      },
      thumbnail_url: "",
    },
  ],
  pagination: {},
} as GetFileVersionsResponse;
