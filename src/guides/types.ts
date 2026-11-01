import React from 'react';

export interface GuideStepProps {
  onNext?: () => void;
  onPrevious?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

// A step as a guide defines it. Its text comes from the translations, under
// guides.<guide id>.steps.<step id>
export interface GuideStepSource {
  id: string;
  render: React.ComponentType<GuideStepProps>;
}

export interface GuideStep extends GuideStepSource {
  title: string;
  shortTitle: string;
  description: string;
  // The guide this step comes from, when it runs inside another one
  group?: string;
}

export type GuideCategory = 'guitar' | 'drums' | 'adapters' | 'turntable' | 'mods';

// A guide as it's defined. Its text comes from the translations, under guides.<id>
export interface GuideSource {
  id: string;
  category: GuideCategory;
  steps: GuideStepSource[];
}

// A guide with its text filled in from the translations
export interface GuideDefinition extends Omit<GuideSource, 'steps'> {
  title: string;
  subtitle: string;
  description: string;
  estimatedTime: string;
  steps: GuideStep[];
}
