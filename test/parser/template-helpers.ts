import { Store } from 'vuex'
import { mount, Wrapper } from '@vue/test-utils'
import {
  Template,
  Element,
  ExpressionNode,
  Attribute,
  Directive,
  VForDirective,
  ElementChild
} from '@/parser/template'
import { Prop, Data } from '@/parser/script'
import VueComponent from '@/view/components/VueComponent.vue'
import { project as originalProject } from '@/view/store/modules/project'

export function render(
  template: Template,
  props: Prop[] = [],
  data: Data[] = []
): Wrapper<VueComponent> {
  const store = new Store({
    modules: { project: originalProject }
  })

  return mount(VueComponent, {
    propsData: {
      template,
      props,
      data,
      styles: ''
    },
    store
  })
}

function processRootChildren(
  children: (Element | ExpressionNode | string)[]
): ElementChild[] {
  return children.map((c, i) => {
    const node =
      typeof c === 'string'
        ? {
            type: 'TextNode' as 'TextNode',
            path: [],
            text: c,
            range: [-1, -1] as [number, number]
          }
        : c

    modifyChildPath(node, [i])
    return node
  })
}

function modifyChildPath(child: ElementChild, path: number[]): ElementChild {
  child.path = path
  if (child.type === 'Element') {
    child.children.forEach((c, i) => {
      modifyChildPath(c, path.concat(i))
    })
  }
  return child
}

export function createTemplate(
  children: (Element | ExpressionNode | string)[]
): Template {
  return {
    type: 'Template',
    attributes: [],
    children: processRootChildren(children),
    range: [-1, -1]
  }
}

export function h(
  tag: string,
  attributes: (Attribute | Directive)[],
  children: (Element | ExpressionNode | string)[]
): Element {
  attributes.forEach((attr, i) => {
    attr.index = i
  })

  return {
    type: 'Element',
    path: [],
    name: tag,
    attributes,
    children: children.map(c => {
      return typeof c === 'string'
        ? {
            type: 'TextNode' as 'TextNode',
            path: [],
            text: c,
            range: [-1, -1] as [number, number]
          }
        : c
    }),
    range: [-1, -1]
  }
}

export function a(name: string, value: string | null): Attribute {
  return {
    type: 'Attribute',
    directive: false,
    index: 0,
    name,
    value,
    range: [-1, -1]
  }
}

export function d(name: string, expression: string): Directive
export function d(
  name: string,
  options?: { argument?: string; modifiers?: string[] },
  expression?: string
): Directive
export function d(
  name: string,
  options: { argument?: string; modifiers?: string[] } | string = {},
  expression?: any
): Directive {
  if (typeof options === 'string') {
    expression = options
    options = {}
  }
  return {
    type: 'Attribute',
    directive: true,
    index: 0,
    name,
    argument: options.argument || null,
    modifiers: options.modifiers || [],
    expression: expression || null,
    range: [-1, -1]
  }
}

export function vFor(left: string[], right: string): VForDirective {
  const dir = d('for') as VForDirective
  dir.left = left
  dir.right = right
  return dir
}

export function exp(expression: string): ExpressionNode {
  return {
    type: 'ExpressionNode',
    path: [],
    expression,
    range: [-1, -1]
  }
}
