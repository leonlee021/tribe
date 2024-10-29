import { TouchableOpacity, Text, Platform } from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof TouchableOpacity>, 'onPress'> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      // Open the link in an in-app browser.
      await openBrowserAsync(href);
    } else {
      // On web, use Linking API.
      window.open(href, '_blank');
    }
  };
  
  return (
    <TouchableOpacity {...rest} onPress={handlePress}>
      <Text>Open Link</Text> {/* Customize as needed */}
    </TouchableOpacity>
  );
}
