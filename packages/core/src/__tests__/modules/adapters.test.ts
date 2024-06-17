import { Adapter } from '../../modules';
import { images, mockAdapter } from '../../mocks';

describe('Adapter', () => {
  let adapter: Adapter;

  beforeEach(() => {
    adapter = mockAdapter('images');
  });

  it('should return the expected results', async () => {
    expect(await adapter.has('images/image1.jpg')).toBe(true);
    expect(await adapter.has('image6.jpg')).toBe(false);

    expect(await adapter.fetch('images/image1.jpg')).toEqual({
      format: 'jpg',
      data: Buffer.from('image data'),
    });
    expect(await adapter.fetch('image6.jpg')).toBeUndefined();

    expect(await adapter.stream('images/image1.jpg')).toBeUndefined();

    expect(await adapter.listImages('')).toEqual(images);

    expect(await adapter.delete('images/image1.jpg')).toBeUndefined();
    expect(await adapter.has('images/image1.jpg')).toBe(false);

    expect(await adapter.clean()).toBeUndefined();
    expect(await adapter.listImages('images')).toHaveLength(0);

    expect(await adapter.save('images/image1.jpg', Buffer.from('image data'))).toBeUndefined();
    expect(await adapter.listImages('images')).toHaveLength(1);
  });
});