import { createTemplate, render, h, d } from '../../helpers/template'

describe('VueComponent v-model', () => {
  it('should bind a value with v-model', () => {
    // prettier-ignore
    const template = createTemplate([
      h('input', [
        d('model', 'test')
      ], [])
    ])

    const wrapper = render(
      template,
      [],
      [
        {
          name: 'test',
          default: 'message'
        }
      ]
    )
    const input = wrapper.find('input').element as HTMLInputElement
    expect(input.value).toBe('message')
  })
})
