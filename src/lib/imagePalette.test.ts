import { describe, expect, it } from 'vitest'
import { selectImagePalette, type ImagePalette } from './imagePalette'

describe('image palette selection', () => {
  const fallback: ImagePalette = ['#aa00aa', '#00aacc', '#ffaa00']

  it('selects distinct saturated colors from image samples', () => {
    const data = new Uint8ClampedArray([
      ...Array(24).fill([220, 55, 45, 255]).flat(),
      ...Array(18).fill([35, 120, 220, 255]).flat(),
      ...Array(12).fill([40, 190, 105, 255]).flat(),
    ])
    const palette = selectImagePalette(data, fallback)
    expect(palette).toHaveLength(3)
    expect(new Set(palette).size).toBe(3)
    expect(palette).not.toEqual(fallback)
  })

  it('uses the configured fallback for unusable pixels', () => {
    const transparent = new Uint8ClampedArray(Array(24).fill([0, 0, 0, 0]).flat())
    expect(selectImagePalette(transparent, fallback)).toEqual(fallback)
  })
})
