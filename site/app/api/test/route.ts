export async function GET() {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts/999', { method: 'GET', headers: { 'Authorization': 'Bearer invalid' } });
  const data = await response.json();
  return Response.json(data);
}