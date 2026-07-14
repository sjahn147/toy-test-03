export function selectOverlayAvailability(state, roomStates = {}) {
  const values = Object.values(roomStates ?? {});
  const has = predicate => values.some(predicate);
  return {
    availability: {
      world: true,
      control: has(room => room.ownership?.ownerFactionId || room.ownership?.contested),
      population: has(room => (room.population?.current ?? 0) > 0 || (room.population?.capacity ?? 0) > 0),
      supply: has(room => room.settlement || (room.activity?.cargo ?? 0) > 0),
      danger: has(room => (room.danger?.score ?? 0) > 0),
      resources: has(room => Object.keys(room.economy ?? {}).some(key => !key.startsWith('cargo') && Number(room.economy[key]) > 0)),
      activity: has(room => room.activity?.combat || room.activity?.siege || room.activity?.construction?.length || room.activity?.workOrders?.length)
    },
    counts: {
      contested: values.filter(room => room.ownership?.contested).length,
      overcrowded: values.filter(room => (room.population?.overcrowded ?? 0) > 0).length,
      highDanger: values.filter(room => (room.danger?.score ?? 0) >= 0.5).length,
      blockaded: values.filter(room => room.settlement?.supplyStatus === 'blockaded').length,
      activeWork: values.reduce((sum, room) => sum + (room.activity?.construction?.length ?? 0) + (room.activity?.workOrders?.length ?? 0), 0)
    }
  };
}
