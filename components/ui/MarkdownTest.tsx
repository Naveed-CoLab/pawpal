import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

interface MarkdownTextProps {
  children: string;
}

export function MarkdownText({ children }: MarkdownTextProps) {
  return (
    <Markdown
      style={{
        body: {
          color: Colors.text,
          fontSize: 16,
          fontFamily: Fonts.body.regular,
          lineHeight: 22,
        },
        heading1: {
          color: Colors.primary,
          fontSize: 24,
          fontFamily: Fonts.heading.bold,
          marginBottom: 12,
          marginTop: 16,
        },
        heading2: {
          color: Colors.text,
          fontSize: 20,
          fontFamily: Fonts.heading.semiBold,
          marginBottom: 10,
          marginTop: 14,
        },
        heading3: {
          color: Colors.text,
          fontSize: 18,
          fontFamily: Fonts.heading.medium,
          marginBottom: 8,
          marginTop: 12,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: 8,
          color: Colors.text,
          fontSize: 16,
          fontFamily: Fonts.body.regular,
          lineHeight: 22,
        },
        strong: {
          fontFamily: Fonts.body.bold,
          color: Colors.text,
        },
        em: {
          fontFamily: Fonts.body.regular,
          fontStyle: 'italic',
          color: Colors.text,
        },
        bullet_list: {
          marginVertical: 4,
        },
        ordered_list: {
          marginVertical: 4,
        },
        list_item: {
          marginVertical: 2,
          flexDirection: 'row',
        },
        bullet_list_icon: {
          color: Colors.primary,
          marginLeft: 4,
          marginRight: 8,
          fontSize: 16,
        },
        ordered_list_icon: {
          color: Colors.primary,
          marginLeft: 4,
          marginRight: 8,
          fontSize: 16,
          fontFamily: Fonts.body.bold,
        },
        bullet_list_content: {
          flex: 1,
          color: Colors.text,
          fontSize: 16,
          fontFamily: Fonts.body.regular,
          lineHeight: 22,
        },
        ordered_list_content: {
          flex: 1,
          color: Colors.text,
          fontSize: 16,
          fontFamily: Fonts.body.regular,
          lineHeight: 22,
        },
        code_inline: {
          backgroundColor: Colors.secondary,
          paddingHorizontal: 4,
          paddingVertical: 2,
          borderRadius: 4,
          fontFamily: 'monospace',
          fontSize: 14,
          color: Colors.text,
        },
        code_block: {
          backgroundColor: Colors.secondary,
          padding: 12,
          borderRadius: 8,
          marginVertical: 8,
        },
        fence: {
          backgroundColor: Colors.secondary,
          padding: 12,
          borderRadius: 8,
          marginVertical: 8,
          fontFamily: 'monospace',
          fontSize: 14,
          color: Colors.text,
        },
        blockquote: {
          backgroundColor: Colors.info,
          borderLeftWidth: 4,
          borderLeftColor: Colors.primary,
          paddingLeft: 12,
          paddingVertical: 8,
          marginVertical: 8,
          borderRadius: 4,
        },
        hr: {
          backgroundColor: Colors.border,
          height: 1,
          marginVertical: 16,
        },
      }}
    >
      {children}
    </Markdown>
  );
}

const sampleMarkdown = `
# VetPaw AI Test Response 🐾

Welcome to **VetPaw AI**! Here's a sample response with various markdown elements:

## Health Tips for Your Dog 🐕

### Basic Care Guidelines:

1. **Daily Exercise** 🏃‍♂️
   - Walk your dog at least 30 minutes daily
   - Provide mental stimulation with toys
   - Consider breed-specific exercise needs

2. **Proper Nutrition** 🥘
   - Feed high-quality dog food
   - Avoid toxic foods like chocolate and grapes
   - Maintain consistent feeding schedule

3. **Regular Health Checks** 🏥
   - Annual vet visits
   - Keep vaccinations up to date
   - Monitor for changes in behavior

### Emergency Signs to Watch For:

- Difficulty breathing 🚨
- Excessive vomiting or diarrhea
- Loss of appetite for more than 24 hours
- Lethargy or unusual behavior

> **Important**: Always consult with your veterinarian for serious health concerns!

### Training Tips 🎾

Use \`positive reinforcement\` techniques:

\`\`\`
Reward good behavior immediately
Keep training sessions short (5-10 minutes)
Be consistent with commands
\`\`\`

---

*Remember: Every dog is unique and may have different needs based on their breed, age, and health status.* 💕

**VetPaw AI is here to help!** 🐾✨
`;

export function MarkdownTest() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Markdown Test Component</Text>
        <Text style={styles.subtitle}>Testing markdown rendering in VetPaw AI responses</Text>
      </View>
      
      <View style={styles.markdownContainer}>
        <MarkdownText>
          {sampleMarkdown}
        </MarkdownText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
  },
  markdownContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
});