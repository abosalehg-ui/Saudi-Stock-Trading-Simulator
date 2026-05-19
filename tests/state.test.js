import { describe, it, expect, beforeEach } from 'vitest';
import { gameState, resetGameState, loadGameState, saveGameState } from '../src/state.js';
import { STORAGE_KEY } from '../src/config.js';

beforeEach(() => {
  resetGameState();
});

describe('loadGameState', () => {
  it('does nothing when storage is empty', () => {
    loadGameState();
    expect(gameState.cash).toBe(50000);
  });

  it('recovers from malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    loadGameState();
    expect(gameState.cash).toBe(50000);
    expect(Array.isArray(gameState.pendingOrders)).toBe(true);
  });

  it('merges a saved game over defaults', () => {
    saveGameState();
    gameState.cash = 12345;
    gameState.shariaFilter = true;
    saveGameState();
    resetGameState();
    loadGameState();
    expect(gameState.cash).toBe(12345);
    expect(gameState.shariaFilter).toBe(true);
  });

  it('repairs missing arrays/objects', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cash: 100 }));
    loadGameState();
    expect(gameState.cash).toBe(100);
    expect(gameState.pendingOrders).toEqual([]);
    expect(gameState.portfolio).toEqual({});
    expect(gameState.priceImpacts).toEqual({});
  });
});
