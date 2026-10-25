import React, { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import {
  createParentCommunityPost,
  loadParentCommunityFeed,
  reactToParentCommunityPost,
  reportParentCommunityPost,
  type ParentCommunityReactionKey,
} from '@/features/circle/parentCommunityRepository';
import { navigateTo } from '@/utils/navigation';
import { ParentCircleScreen } from '@screens/ParentCircleScreen';
import type { ParentCirclePost } from '@/types';

function friendlyCommunityNotice(): string {
  return 'Parent Circle community is available to verified guardian accounts. Nothing private was shared.';
}

export default function ParentCircleRoute() {
  const {
    parentCirclePosts,
    setParentCirclePosts,
    parentCirclePostText,
    setParentCirclePostText,
  } = useAppContext();
  const [communityNotice, setCommunityNotice] = useState<string | null>(null);

  const refreshCommunity = useCallback(async () => {
    try {
      const cloud = await loadParentCommunityFeed();
      setParentCirclePosts(cloud);
      setCommunityNotice(null);
    } catch {
      setParentCirclePosts([]);
      setCommunityNotice(friendlyCommunityNotice());
    }
  }, [setParentCirclePosts]);

  useEffect(() => {
    void refreshCommunity();
  }, [refreshCommunity]);

  const saveCommunityPost = useCallback(async (extra?: Partial<ParentCirclePost>) => {
    const text = (extra?.text ?? parentCirclePostText).trim();
    if (!text) return;

    const saved = await createParentCommunityPost(text, extra?.circleTag);
    setParentCirclePosts(current => [
      saved,
      ...current.filter(post => String(post.id) !== String(saved.id)),
    ]);
    setCommunityNotice(null);
  }, [parentCirclePostText, setParentCirclePosts]);

  const reactToCommunityPost = useCallback(async (
    id: string | number,
    type: string,
  ) => {
    const reactions = await reactToParentCommunityPost(
      String(id),
      type as ParentCommunityReactionKey,
    );
    setParentCirclePosts(current => current.map(post =>
      String(post.id) === String(id)
        ? { ...post, reactions }
        : post
    ));
  }, [setParentCirclePosts]);

  const reportCommunityPost = useCallback(async (id: string | number) => {
    await reportParentCommunityPost(String(id));
  }, []);

  return (
    <ParentCircleScreen
      parentCirclePosts={parentCirclePosts}
      parentCirclePostText={parentCirclePostText}
      setParentCirclePostText={setParentCirclePostText}
      saveParentCirclePost={saveCommunityPost}
      reactToParentPost={reactToCommunityPost}
      reportParentPost={reportCommunityPost}
      communityNotice={communityNotice}
      setScreen={navigateTo}
      BottomNav={null}
      onPostPress={id => router.push(`/(parent)/circle/${String(id)}` as never)}
    />
  );
}
