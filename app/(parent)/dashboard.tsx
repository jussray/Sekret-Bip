import { Redirect } from 'expo-router';

export default function ParentDoorbellAlias() {
  return <Redirect href="/(parent)/bridge?tab=signals" />;
}
