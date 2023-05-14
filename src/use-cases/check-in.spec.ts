import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InMemoryCheckInsRepository } from '@/repositories/in-memory/in-memory-check-ins-repository'
import { CheckInUseCase } from './check-in'
import { InMemoryGymsRepository } from '@/repositories/in-memory/in-memory-gyms-repository'
import { Decimal } from '@prisma/client/runtime/library'
import { MaxNumberOfCheckInsError } from './errors/max-number-of-check-ins-error'
import { MaxDistanceError } from './errors/max-distance-error'

let checkInsRepository: InMemoryCheckInsRepository
let gymsRepository: InMemoryGymsRepository
let sut: CheckInUseCase

describe('Check-In Use Case', () => {
  beforeEach(async () => {
    checkInsRepository = new InMemoryCheckInsRepository()
    gymsRepository = new InMemoryGymsRepository()
    sut = new CheckInUseCase(checkInsRepository, gymsRepository)

    await gymsRepository.create({
      id: 'gym-01',
      title: 'JavaScript Gym',
      description: '',
      phone: '',
      latitude: -29.6987251,
      longitude: -53.8780633,
    })

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should be able to check in', async () => {
    const { checkIn } = await sut.execute({
      gymId: 'gym-01',
      userId: 'user-01',
      userLatitude: -29.6987251,
      userLongitude: -53.8780633,
    })

    expect(checkIn.id).toEqual(expect.any(String))
  })

  it('should not be able to check in twice in the same day', async () => {
    vi.setSystemTime(new Date(2023, 0, 10, 8, 0, 0))
    await sut.execute({
      gymId: 'gym-01',
      userId: 'user-01',
      userLatitude: -29.6987251,
      userLongitude: -53.8780633,
    })

    await expect(() =>
      sut.execute({
        gymId: 'gym-01',
        userId: 'user-01',
        userLatitude: -29.6987251,
        userLongitude: -53.8780633,
      }),
    ).rejects.toBeInstanceOf(MaxNumberOfCheckInsError)
  })

  it('should be able to check in twice but in different days', async () => {
    vi.setSystemTime(new Date(2023, 0, 10, 8, 0, 0))
    await sut.execute({
      gymId: 'gym-01',
      userId: 'user-01',
      userLatitude: -29.6987251,
      userLongitude: -53.8780633,
    })

    vi.setSystemTime(new Date(2023, 0, 11, 8, 0, 0))

    const { checkIn } = await sut.execute({
      gymId: 'gym-01',
      userId: 'user-01',
      userLatitude: -29.6987251,
      userLongitude: -53.8780633,
    })

    expect(checkIn.id).toEqual(expect.any(String))
  })

  it('should not be able to check in on distant gym', async () => {
    gymsRepository.items.push({
      id: 'gym-02',
      title: 'JavaScript Gym',
      description: '',
      phone: '',
      latitude: new Decimal(-29.6724042),
      longitude: new Decimal(-53.8085861),
    })

    await expect(() =>
      sut.execute({
        gymId: 'gym-02',
        userId: 'user-01',
        userLatitude: -29.6987251,
        userLongitude: -53.8780633,
      }),
    ).rejects.toBeInstanceOf(MaxDistanceError)
  })
})
