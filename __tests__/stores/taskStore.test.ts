import { useTaskStore } from '@/stores/taskStore'

describe('taskStore', () => {
  beforeEach(() => useTaskStore.setState({ tasks: [] }))

  it('adds a task', () => {
    useTaskStore.getState().addTask('Buy groceries')
    expect(useTaskStore.getState().tasks).toHaveLength(1)
    expect(useTaskStore.getState().tasks[0].completed).toBe(false)
  })

  it('toggles a task', () => {
    useTaskStore.getState().addTask('Walk the dog')
    const id = useTaskStore.getState().tasks[0].id
    useTaskStore.getState().toggleTask(id)
    expect(useTaskStore.getState().tasks[0].completed).toBe(true)
  })

  it('removes a task', () => {
    useTaskStore.getState().addTask('Clean house')
    const id = useTaskStore.getState().tasks[0].id
    useTaskStore.getState().removeTask(id)
    expect(useTaskStore.getState().tasks).toHaveLength(0)
  })
})
