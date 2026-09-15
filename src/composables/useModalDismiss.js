import { nextTick, onBeforeUnmount, toValue, watch } from 'vue'

// 覆盖层弹窗共用行为：Esc 关闭、打开时锁定 body 滚动并补偿滚动条宽度、焦点落到关闭按钮。
// ChangelogModal / ContactModal 共用；不要在这两个组件里各留一份。
export function useModalDismiss({ open, close, focusRef }) {
  let prevOverflow = ''
  let prevPaddingRight = ''

  function onKeydown(event) {
    if (event.key === 'Escape') close()
  }

  function lockBodyScroll() {
    prevOverflow = document.body.style.overflow
    prevPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
  }

  function unlockBodyScroll() {
    document.body.style.overflow = prevOverflow
    document.body.style.paddingRight = prevPaddingRight
    window.removeEventListener('keydown', onKeydown)
  }

  watch(
    () => toValue(open),
    next => {
      if (next) {
        lockBodyScroll()
        nextTick(() => focusRef?.value?.focus())
      } else {
        unlockBodyScroll()
      }
    },
  )

  onBeforeUnmount(() => {
    if (toValue(open)) unlockBodyScroll()
  })
}
