import React from 'react';
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
          fontSize: 13,
          fontFamily: Fonts.body.regular,
          lineHeight: 18,
        },
        heading1: {
          color: Colors.primary,
          fontSize: 18,
          fontFamily: Fonts.heading.bold,
          marginBottom: 8,
          marginTop: 12,
        },
        heading2: {
          color: Colors.text,
          fontSize: 16,
          fontFamily: Fonts.heading.semiBold,
          marginBottom: 6,
          marginTop: 10,
        },
        heading3: {
          color: Colors.text,
          fontSize: 15,
          fontFamily: Fonts.heading.medium,
          marginBottom: 6,
          marginTop: 8,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: 6,
          color: Colors.text,
          fontSize: 13,
          fontFamily: Fonts.body.regular,
          lineHeight: 18,
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
          marginVertical: 3,
        },
        ordered_list: {
          marginVertical: 3,
        },
        list_item: {
          marginVertical: 1,
          flexDirection: 'row',
        },
        bullet_list_icon: {
          color: Colors.primary,
          marginLeft: 3,
          marginRight: 6,
          fontSize: 13,
        },
        ordered_list_icon: {
          color: Colors.primary,
          marginLeft: 3,
          marginRight: 6,
          fontSize: 13,
          fontFamily: Fonts.body.bold,
        },
        bullet_list_content: {
          flex: 1,
          color: Colors.text,
          fontSize: 13,
          fontFamily: Fonts.body.regular,
          lineHeight: 18,
        },
        ordered_list_content: {
          flex: 1,
          color: Colors.text,
          fontSize: 13,
          fontFamily: Fonts.body.regular,
          lineHeight: 18,
        },
        code_inline: {
          backgroundColor: Colors.secondary,
          paddingHorizontal: 3,
          paddingVertical: 1,
          borderRadius: 3,
          fontFamily: 'monospace',
          fontSize: 12,
          color: Colors.text,
        },
        code_block: {
          backgroundColor: Colors.secondary,
          padding: 10,
          borderRadius: 6,
          marginVertical: 6,
        },
        fence: {
          backgroundColor: Colors.secondary,
          padding: 10,
          borderRadius: 6,
          marginVertical: 6,
          fontFamily: 'monospace',
          fontSize: 12,
          color: Colors.text,
        },
        blockquote: {
          backgroundColor: Colors.info,
          borderLeftWidth: 3,
          borderLeftColor: Colors.primary,
          paddingLeft: 10,
          paddingVertical: 6,
          marginVertical: 6,
          borderRadius: 3,
        },
        hr: {
          backgroundColor: Colors.border,
          height: 1,
          marginVertical: 12,
        },
      }}
    >
      {children}
    </Markdown>
  );
}