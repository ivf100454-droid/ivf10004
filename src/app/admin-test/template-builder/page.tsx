"use client";

import { useEffect, useState } from "react";

type ItemDraft = {
  uiId: string;
  title: string;
  hasCheck: boolean;
  hasCount: boolean;
  targetCount: string;
  hasScore: boolean;
  maxScore: string;
  hasLink: boolean;
  linkUrl: string;
  linkLabel: string;
  teachingVideoId: string;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  requiredFeatures: Record<string, boolean>;
};

type Template = {
  templateId: string;
  name: string;
  items: {
    templateItemId: string;
    title: string;
    hasCheck: boolean;
    hasCount: boolean;
    targetCount: number | null;
    hasScore: boolean;
    maxScore: number | null;
    linkUrl: string | null;
    linkLabel: string | null;
    teachingVideoId: string | null;
    hasPhotoSubmission: boolean;
    hasAudioSubmission: boolean;
