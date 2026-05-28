import type { AppLocale } from '@moritzbrantner/app-pack';

import { ChatRoom } from '@/apps/showcase/components/chat-room';
import { getEnv } from '@/src/config/env';
import { createTranslator } from '@/src/i18n/messages';

export default async function ChatPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'ChatPage');
  const env = getEnv();

  return (
    <ChatRoom
      locale={locale}
      tenorEnabled={env.tenor.configured}
      labels={{
        title: t('title'),
        status: t('status'),
        searchConversations: t('searchConversations'),
        rooms: t('rooms'),
        members: t('members'),
        activeNow: t('activeNow'),
        messagePlaceholder: t('messagePlaceholder'),
        send: t('send'),
        openGifPicker: t('openGifPicker'),
        closeGifPicker: t('closeGifPicker'),
        gifSearchPlaceholder: t('gifSearchPlaceholder'),
        gifSearchEmpty: t('gifSearchEmpty'),
        gifSearchLoading: t('gifSearchLoading'),
        gifSearchUnavailable: t('gifSearchUnavailable'),
        gifSearchError: t('gifSearchError'),
        selectGif: t('selectGif'),
        selectedGif: t('selectedGif'),
        removeGif: t('removeGif'),
        tenorAttribution: t('tenorAttribution'),
        tenorLinkAttached: t('tenorLinkAttached'),
        pastedTenorLink: t('pastedTenorLink'),
        conversations: {
          design: t('conversations.design'),
          product: t('conversations.product'),
          support: t('conversations.support'),
        },
        users: {
          you: t('users.you'),
          mara: t('users.mara'),
          leon: t('users.leon'),
          priya: t('users.priya'),
          noah: t('users.noah'),
          ava: t('users.ava'),
        },
        roles: {
          productDesigner: t('roles.productDesigner'),
          frontendLead: t('roles.frontendLead'),
          productManager: t('roles.productManager'),
          supportOps: t('roles.supportOps'),
          qaEngineer: t('roles.qaEngineer'),
        },
        sampleMessages: {
          design1: t('sampleMessages.design1'),
          design2: t('sampleMessages.design2'),
          product1: t('sampleMessages.product1'),
          product2: t('sampleMessages.product2'),
          support1: t('sampleMessages.support1'),
          support2: t('sampleMessages.support2'),
          autoReply: t('sampleMessages.autoReply'),
        },
      }}
    />
  );
}
