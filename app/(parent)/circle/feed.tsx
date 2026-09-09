import React, { useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { navigateTo } from '@/utils/navigation';
import { loadParentCircleFeed } from '@/utils/sync';
import { ParentCircleScreen } from '@screens/ParentCircleScreen';
import type { ParentCirclePost } from '@/types';

export default function ParentCircleRoute() {
  const {
    parentCirclePosts,
    setParentCirclePosts,
    parentCirclePostText,
    setParentCirclePostText,
    saveParentCirclePost,
    reactToParentPost,
  } = useAppContext();

  const mergeCloudPosts = useCallback(async () => {
    const cloud = await loadParentCircleFeed();
    if (!cloud.length) return;

    setParentCirclePosts((local: ParentCirclePost[]) => {
      const cloudIds = new Set(cloud.map(post => String(post.id)));
      const localOnly = local.filter(post => !cloudIds.has(String(post.id)));
      return [...cloud, ...localOnly];
    });
  }, [setParentCirclePosts]);

  useEffect(() => {
    void mergeCloudPosts();
  }, [mergeCloudPosts]);

  return (
    <ParentCircleScreen
      parentCirclePosts={parentCirclePosts}
      parentCirclePostText={parentCirclePostText}
      setParentCirclePostText={setParentCirclePostText}
      saveParentCirclePost={saveParentCirclePost}
      reactToParentPost={(id: string | number, type: string) => reactToParentPost(Number(id), type)}
      setScreen={navigateTo}
      BottomNav={null}
      onPostPress={id => router.push(`/(parent)/circle/${id}` as never)}
    />
  );
}
