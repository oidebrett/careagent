export const updateAnomalyStatus = async (id: number, status: string) => {
  const response = await fetch(`/api/sensor-data/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      estimate: status
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update anomaly status');
  }

  return await response.json();
};