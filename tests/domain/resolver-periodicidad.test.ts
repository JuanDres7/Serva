import { describe, it, expect } from 'vitest'
import { resolverPeriodicidad } from '@/lib/domain/recurrence'

describe('resolverPeriodicidad', () => {
  it('cada mes el 5 → monthly/5', () => {
    const r = resolverPeriodicidad('cada mes el 5')
    expect(r).toEqual({ ok: true, periodicidad: { kind: 'monthly', day: 5 } })
  })

  it('mensual sin día → necesitaDia', () => {
    const r = resolverPeriodicidad('mensual')
    expect(r).toEqual({ ok: false, necesitaDia: true })
  })

  it('cada mes sin día → necesitaDia', () => {
    const r = resolverPeriodicidad('cada mes')
    expect(r).toEqual({ ok: false, necesitaDia: true })
  })

  it('semanal → every-n-days/7', () => {
    const r = resolverPeriodicidad('semanal')
    expect(r).toEqual({ ok: true, periodicidad: { kind: 'every-n-days', n: 7 } })
  })

  it('cada semana → every-n-days/7', () => {
    const r = resolverPeriodicidad('cada semana')
    expect(r).toEqual({ ok: true, periodicidad: { kind: 'every-n-days', n: 7 } })
  })

  it('quincenal → every-n-days/15', () => {
    const r = resolverPeriodicidad('quincenal')
    expect(r).toEqual({ ok: true, periodicidad: { kind: 'every-n-days', n: 15 } })
  })

  it('cada dos semanas → every-n-days/15', () => {
    const r = resolverPeriodicidad('cada dos semanas')
    expect(r).toEqual({ ok: true, periodicidad: { kind: 'every-n-days', n: 15 } })
  })

  it('diario → every-n-days/1', () => {
    const r = resolverPeriodicidad('diario')
    expect(r).toEqual({ ok: true, periodicidad: { kind: 'every-n-days', n: 1 } })
  })

  it('anual → every-n-days/365', () => {
    const r = resolverPeriodicidad('anual')
    expect(r).toEqual({ ok: true, periodicidad: { kind: 'every-n-days', n: 365 } })
  })

  it('cada 10 días → every-n-days/10', () => {
    const r = resolverPeriodicidad('cada 10 días')
    expect(r).toEqual({ ok: true, periodicidad: { kind: 'every-n-days', n: 10 } })
  })

  it('texto irreconocible → ok false, sin necesitaDia', () => {
    const r = resolverPeriodicidad('los martes')
    expect(r).toEqual({ ok: false, necesitaDia: false })
  })
})
