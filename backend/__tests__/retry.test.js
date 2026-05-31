jest.mock('../services/broadcaster', () => ({
  broadcast: jest.fn()
}));

const { retryWithBackoff } = require('../utils/retry');

describe('retryWithBackoff', () => {
  it('resolves with result on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('done');
    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

    await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow('persistent failure');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses default config values when not specified', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('ok');
  });
});
