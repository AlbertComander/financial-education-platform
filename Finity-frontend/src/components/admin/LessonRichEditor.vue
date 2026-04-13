<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Extension } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import UnderlineExtension from '@tiptap/extension-underline'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

type Alignment = 'left' | 'center' | 'right'

type ToolbarButton = {
  key: string
  title: string
  icon: unknown
  label?: string
  isActive: () => boolean
  run: () => void
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    disabled?: boolean
    uploadImage: (file: File) => Promise<string>
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadError = ref('')
const isUploadingImage = ref(false)

const FirstLineIndent = Extension.create({
  name: 'firstLineIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          firstLineIndent: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-first-line-indent') === 'true',
            renderHTML: (attributes) =>
              attributes.firstLineIndent ? { 'data-first-line-indent': 'true' } : {},
          },
        },
      },
    ]
  },
})

const editor = useEditor({
  content: props.modelValue || '<p></p>',
  editable: !props.disabled,
  editorProps: {
    attributes: {
      class: 'lesson-rich-editor__surface',
    },
  },
  extensions: [
    StarterKit,
    UnderlineExtension,
    FirstLineIndent,
    Image.configure({
      HTMLAttributes: {
        class: 'lesson-rich-editor__image',
      },
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
    }),
    Placeholder.configure({
      placeholder: 'Начните оформлять материал урока',
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ],
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', instance.getHTML())
  },
})

const toolbarButtons = computed<ToolbarButton[]>(() => {
  const instance = editor.value
  if (!instance) {
    return []
  }

  return [
    {
      key: 'bold',
      title: 'Жирный',
      icon: Bold,
      isActive: () => instance.isActive('bold'),
      run: () => instance.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      title: 'Курсив',
      icon: Italic,
      isActive: () => instance.isActive('italic'),
      run: () => instance.chain().focus().toggleItalic().run(),
    },
    {
      key: 'underline',
      title: 'Подчёркивание',
      icon: Underline,
      isActive: () => instance.isActive('underline'),
      run: () => instance.chain().focus().toggleUnderline().run(),
    },
    {
      key: 'strike',
      title: 'Зачёркивание',
      icon: Strikethrough,
      isActive: () => instance.isActive('strike'),
      run: () => instance.chain().focus().toggleStrike().run(),
    },
    {
      key: 'heading-1',
      title: 'Заголовок 1',
      icon: Heading1,
      isActive: () => instance.isActive('heading', { level: 1 }),
      run: () => instance.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      key: 'heading-2',
      title: 'Заголовок 2',
      icon: Heading2,
      isActive: () => instance.isActive('heading', { level: 2 }),
      run: () => instance.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: 'heading-3',
      title: 'Заголовок 3',
      icon: Heading3,
      isActive: () => instance.isActive('heading', { level: 3 }),
      run: () => instance.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      key: 'bullet-list',
      title: 'Маркированный список',
      icon: List,
      isActive: () => instance.isActive('bulletList'),
      run: () => instance.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'ordered-list',
      title: 'Нумерованный список',
      icon: ListOrdered,
      isActive: () => instance.isActive('orderedList'),
      run: () => instance.chain().focus().toggleOrderedList().run(),
    },
    {
      key: 'blockquote',
      title: 'Цитата',
      icon: Quote,
      isActive: () => instance.isActive('blockquote'),
      run: () => instance.chain().focus().toggleBlockquote().run(),
    },
    {
      key: 'rule',
      title: 'Разделитель',
      icon: Minus,
      isActive: () => false,
      run: () => instance.chain().focus().setHorizontalRule().run(),
    },
    {
      key: 'first-line-indent',
      title: 'Красная строка',
      icon: Pilcrow,
      label: 'Отступ',
      isActive: () => instance.isActive('paragraph', { firstLineIndent: true }),
      run: () =>
        instance
          .chain()
          .focus()
          .setParagraph()
          .updateAttributes('paragraph', {
            firstLineIndent: !instance.isActive('paragraph', { firstLineIndent: true }),
          })
          .run(),
    },
  ]
})

const alignmentButtons = computed(() => {
  const instance = editor.value
  if (!instance) {
    return [] as Array<{ key: Alignment; title: string; icon: unknown; isActive: boolean }>
  }

  return [
    { key: 'left' as const, title: 'Выравнивание по левому краю', icon: AlignLeft },
    { key: 'center' as const, title: 'Выравнивание по центру', icon: AlignCenter },
    { key: 'right' as const, title: 'Выравнивание по правому краю', icon: AlignRight },
  ].map((item) => ({
    ...item,
    isActive: instance.isActive({ textAlign: item.key }),
  }))
})

watch(
  () => props.modelValue,
  (value) => {
    const instance = editor.value
    if (!instance) {
      return
    }

    const normalizedValue = value || '<p></p>'
    if (instance.getHTML() === normalizedValue) {
      return
    }

    instance.commands.setContent(normalizedValue, { emitUpdate: false })
  },
)

watch(
  () => props.disabled,
  (value) => {
    editor.value?.setEditable(!value)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function triggerImagePicker() {
  if (props.disabled || isUploadingImage.value) {
    return
  }

  fileInputRef.value?.click()
}

function setParagraph() {
  editor.value?.chain().focus().setParagraph().run()
}

function isParagraphActive() {
  return editor.value?.isActive('paragraph') ?? false
}

function setAlignment(alignment: Alignment) {
  editor.value?.chain().focus().setTextAlign(alignment).run()
}

function setLink() {
  const instance = editor.value
  if (!instance) {
    return
  }

  const attributes = instance.getAttributes('link')
  const currentHref = typeof attributes.href === 'string' ? attributes.href : 'https://'
  const nextHref = window.prompt('Введите ссылку', currentHref)

  if (nextHref === null) {
    return
  }

  const normalizedHref = nextHref.trim()
  if (!normalizedHref) {
    instance.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  instance.chain().focus().extendMarkRange('link').setLink({ href: normalizedHref }).run()
}

function unsetLink() {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
}

async function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]

  if (!file || !editor.value) {
    return
  }

  uploadError.value = ''
  isUploadingImage.value = true

  try {
    const url = await props.uploadImage(file)
    editor.value.chain().focus().setImage({ src: url, alt: file.name }).run()
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : 'Не удалось загрузить изображение'
  } finally {
    isUploadingImage.value = false
    if (input) {
      input.value = ''
    }
  }
}
</script>

<template>
  <div class="lesson-rich-editor">
    <div class="lesson-rich-editor__toolbar">
      <div class="lesson-rich-editor__toolbar-group">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="lesson-rich-editor__toolbar-button"
          :class="{ 'lesson-rich-editor__toolbar-button--active': isParagraphActive() }"
          :disabled="props.disabled"
          @click="setParagraph"
        >
          P
        </Button>

        <Button
          v-for="button in toolbarButtons"
          :key="button.key"
          type="button"
          variant="outline"
          size="sm"
          class="lesson-rich-editor__toolbar-button"
          :class="{ 'lesson-rich-editor__toolbar-button--active': button.isActive() }"
          :title="button.title"
          :disabled="props.disabled"
          @click="button.run"
        >
          <span v-if="button.label" class="lesson-rich-editor__toolbar-text">
            {{ button.label }}
          </span>
          <component v-else :is="button.icon" class="lesson-rich-editor__toolbar-icon" />
        </Button>
      </div>

      <div class="lesson-rich-editor__toolbar-group">
        <Button
          v-for="button in alignmentButtons"
          :key="button.key"
          type="button"
          variant="outline"
          size="sm"
          class="lesson-rich-editor__toolbar-button"
          :class="{ 'lesson-rich-editor__toolbar-button--active': button.isActive }"
          :title="button.title"
          :disabled="props.disabled"
          @click="setAlignment(button.key)"
        >
          <component :is="button.icon" class="lesson-rich-editor__toolbar-icon" />
        </Button>
      </div>

      <div class="lesson-rich-editor__toolbar-group">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="lesson-rich-editor__toolbar-button"
          :class="{ 'lesson-rich-editor__toolbar-button--active': editor?.isActive('link') }"
          :disabled="props.disabled"
          title="Добавить ссылку"
          @click="setLink"
        >
          <Link2 class="lesson-rich-editor__toolbar-icon" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="lesson-rich-editor__toolbar-button"
          :disabled="props.disabled || !(editor?.isActive('link') ?? false)"
          title="Убрать ссылку"
          @click="unsetLink"
        >
          <Link2Off class="lesson-rich-editor__toolbar-icon" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="lesson-rich-editor__toolbar-button"
          :disabled="props.disabled || isUploadingImage"
          :title="isUploadingImage ? 'Загрузка изображения...' : 'Вставить изображение'"
          @click="triggerImagePicker"
        >
          <ImagePlus class="lesson-rich-editor__toolbar-icon" />
        </Button>
      </div>

      <div class="lesson-rich-editor__toolbar-group">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="lesson-rich-editor__toolbar-button"
          :disabled="props.disabled || !(editor?.can().chain().focus().undo().run() ?? false)"
          title="Отменить"
          @click="editor?.chain().focus().undo().run()"
        >
          <Undo2 class="lesson-rich-editor__toolbar-icon" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="lesson-rich-editor__toolbar-button"
          :disabled="props.disabled || !(editor?.can().chain().focus().redo().run() ?? false)"
          title="Повторить"
          @click="editor?.chain().focus().redo().run()"
        >
          <Redo2 class="lesson-rich-editor__toolbar-icon" />
        </Button>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      class="lesson-rich-editor__file-input"
      @change="onImageSelected"
    >

    <p v-if="uploadError" class="lesson-rich-editor__message lesson-rich-editor__message--error">
      {{ uploadError }}
    </p>
    <p v-else-if="isUploadingImage" class="lesson-rich-editor__message">
      Загружаю изображение...
    </p>

    <div class="lesson-rich-editor__content-wrap" :class="{ 'lesson-rich-editor__content-wrap--disabled': props.disabled }">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<style scoped>
.lesson-rich-editor {
  display: grid;
  gap: 12px;
}

.lesson-rich-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lesson-rich-editor__toolbar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lesson-rich-editor__toolbar-button {
  min-width: 38px;
  height: 38px;
  padding: 0 10px;
}

.lesson-rich-editor__toolbar-button--active {
  background: hsl(var(--accent));
  border-color: hsl(214 72% 82%);
}

.lesson-rich-editor__toolbar-icon {
  width: 16px;
  height: 16px;
}

.lesson-rich-editor__toolbar-text {
  font-size: 12px;
  line-height: 1;
}

.lesson-rich-editor__file-input {
  display: none;
}

.lesson-rich-editor__message {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.lesson-rich-editor__message--error {
  color: hsl(var(--destructive));
}

.lesson-rich-editor__content-wrap {
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--background));
  overflow: hidden;
}

.lesson-rich-editor__content-wrap--disabled {
  opacity: 0.72;
}

.lesson-rich-editor__content-wrap :deep(.lesson-rich-editor__surface) {
  min-height: 420px;
  padding: 18px;
  outline: none;
}

.lesson-rich-editor__content-wrap :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: hsl(var(--muted-foreground));
  pointer-events: none;
  float: left;
  height: 0;
}

.lesson-rich-editor__content-wrap :deep(h1),
.lesson-rich-editor__content-wrap :deep(h2),
.lesson-rich-editor__content-wrap :deep(h3) {
  margin: 1.1em 0 0.5em;
  line-height: 1.2;
}

.lesson-rich-editor__content-wrap :deep(h1) {
  font-size: 30px;
}

.lesson-rich-editor__content-wrap :deep(h2) {
  font-size: 25px;
}

.lesson-rich-editor__content-wrap :deep(h3) {
  font-size: 21px;
}

.lesson-rich-editor__content-wrap :deep(p) {
  margin: 0 0 1em;
  line-height: 1.8;
}

.lesson-rich-editor__content-wrap :deep(ul),
.lesson-rich-editor__content-wrap :deep(ol) {
  margin: 0 0 1em;
  padding-left: 1.75em;
  list-style-position: outside;
}

.lesson-rich-editor__content-wrap :deep(ul) {
  list-style: disc;
}

.lesson-rich-editor__content-wrap :deep(ol) {
  list-style: decimal;
}

.lesson-rich-editor__content-wrap :deep(li) {
  margin: 0.35em 0;
  line-height: 1.7;
}

.lesson-rich-editor__content-wrap :deep(li > p) {
  margin: 0;
}

.lesson-rich-editor__content-wrap :deep(p[data-first-line-indent='true']) {
  text-indent: 1.5em;
}

.lesson-rich-editor__content-wrap :deep(blockquote) {
  margin: 0 0 1em;
  padding: 0.8em 1em;
  border-left: 4px solid hsl(214 75% 60%);
  background: hsl(214 100% 98%);
  color: hsl(var(--foreground));
}

.lesson-rich-editor__content-wrap :deep(hr) {
  margin: 1.3em 0;
  border: 0;
  border-top: 1px solid hsl(var(--border));
}

.lesson-rich-editor__content-wrap :deep(a) {
  color: hsl(214 78% 46%);
  text-decoration: underline;
}

.lesson-rich-editor__content-wrap :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.2em auto;
  border-radius: 16px;
}

@media (max-width: 760px) {
  .lesson-rich-editor__toolbar {
    gap: 6px;
  }

  .lesson-rich-editor__toolbar-group {
    gap: 6px;
  }

  .lesson-rich-editor__toolbar-button {
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
  }

  .lesson-rich-editor__content-wrap :deep(.lesson-rich-editor__surface) {
    min-height: 320px;
    padding: 14px;
  }
}
</style>
