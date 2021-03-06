<script lang="ts">
import Vue, { VNode, VNodeData } from 'vue'
import ContainerVueComponent from './ContainerVueComponent.vue'
import VueChild from './VueChild.vue'
import { TEElement } from '@/parser/template/types'
import { DefaultValue, ChildComponent } from '@/parser/script/types'
import {
  convertToVNodeData,
  resolveControlDirectives,
  ResolvedChild,
  resolveScopedSlots
} from '../ui-logic/rendering'
import { DraggingPlace } from '../store/modules/project/types'
import { mapValues } from '@/utils'

export default Vue.extend({
  name: 'VueNode',

  props: {
    uri: {
      type: String,
      required: true
    },
    data: {
      type: Object as { (): TEElement },
      required: true
    },
    scope: {
      type: Object as { (): Record<string, DefaultValue> },
      required: true
    },
    childComponents: {
      type: Array as { (): ChildComponent[] },
      required: true
    },
    slots: {
      type: Object as { (): Record<string, VNode[]> },
      required: true
    },
    scopedSlots: {
      type: Object,
      required: true
    },
    selectable: {
      type: Boolean,
      default: false
    },
    selected: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    vnodeTag(): string | typeof Vue {
      if (this.nodeUri) {
        return ContainerVueComponent
      }

      return this.data.name
    },

    vnodeData(): VNodeData {
      const { data: node, scope, selectable } = this
      const data = convertToVNodeData(node.name, node.startTag, scope)

      if (selectable) {
        // The vnode may be a native element or ContainerVueComponent,
        // so we should set both `on` and `nativeOn` here.
        data.on = data.nativeOn = {
          click: this.onClick,
          dragover: this.onDragOver,
          drop: this.onDrop
        }
      }

      const tag = this.vnodeTag
      if (tag === ContainerVueComponent) {
        data.props = {
          uri: this.nodeUri,
          propsData: data.attrs
        }
      }

      const scopedSlots = resolveScopedSlots(node)
      if (scopedSlots) {
        const h = this.$createElement
        data.scopedSlots = mapValues(scopedSlots, ({ scopeName, contents }) => {
          return (props: any) => {
            const newScope = {
              ...scope,
              [scopeName]: props
            }
            const resolved = contents.reduce<ResolvedChild[]>((acc, child) => {
              return resolveControlDirectives(acc, {
                el: child,
                scope: newScope
              })
            }, [])

            return resolved.map(c => {
              return h(VueChild, {
                props: {
                  uri: this.uri,
                  data: c.el,
                  scope: c.scope,
                  childComponents: this.childComponents,
                  slots: this.slots,
                  scopedSlots: this.scopedSlots
                },
                on: this.$listeners
              })
            })
          }
        })
      }

      return data
    },

    /**
     * Get corresponding component URI of this node.
     * If it has a URI, is treated as a component rather than native element.
     */
    nodeUri(): string | undefined {
      const comp = this.childComponents.find(child => {
        // Convert to lower case since vue-eslint-parser ignores tag name case.
        return child.name.toLowerCase() === this.data.name.toLowerCase()
      })
      return comp && comp.uri
    },

    /**
     * Returns children which is resolved v-for, v-if and its family.
     */
    resolvedChildren(): ResolvedChild[] {
      return this.data.children
        .filter(child => {
          return child.type !== 'Element' || !child.startTag.attrs['slot-scope']
        })
        .reduce<ResolvedChild[]>((acc, child) => {
          return resolveControlDirectives(acc, {
            el: child,
            scope: this.scope
          })
        }, [])
    }
  },

  methods: {
    onClick(event: Event): void {
      event.stopPropagation()

      this.$emit('select', {
        ast: this.data,
        element: event.currentTarget
      })
    },

    onDragOver(event: DragEvent): void {
      if (this.data.path.length === 0) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'copy'

      // Detect where the dragging node will be put
      const outRatio = 0.2
      const bounds = (event.target as HTMLElement).getBoundingClientRect()
      const h = bounds.height
      const posY = event.pageY - bounds.top
      const ratioY = posY / h

      let place: DraggingPlace
      if (ratioY <= outRatio) {
        place = 'before'
      } else if (ratioY < 0.5) {
        place = 'first'
      } else if (ratioY < 1 - outRatio) {
        place = 'last'
      } else {
        place = 'after'
      }

      this.$emit('dragover', {
        path: this.data.path,
        place
      })
    },

    onDrop(event: DragEvent): void {
      if (this.data.path.length === 0) {
        return
      }

      event.stopPropagation()
      this.$emit('add')
    }
  },

  render(h): VNode {
    const { uri, childComponents, slots, scopedSlots } = this

    return h(
      this.vnodeTag,
      this.vnodeData,
      this.resolvedChildren.map(c => {
        // Slot name will be resolved in <VueChild> component
        return h(VueChild, {
          props: {
            uri,
            data: c.el,
            scope: c.scope,
            childComponents,
            slots,
            scopedSlots
          },
          on: this.$listeners
        })
      })
    )
  }
})
</script>
