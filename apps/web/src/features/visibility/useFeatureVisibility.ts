import { useContext } from 'react';
import { FeatureVisibilityContext } from './feature-visibility-context';

export function useFeatureVisibility() { return useContext(FeatureVisibilityContext); }
