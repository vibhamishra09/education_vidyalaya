async function testApi() {
  try {
    console.log('Fetching public feed...');
    const res = await fetch('http://localhost:3001/api/dashboard/feed?mode=for_you&limit=8', {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    console.log('Status:', res.status);
    
    if (!res.ok) {
        const text = await res.text();
        console.log('Error Data:', text);
        return;
    }
    
    const data = await res.json();
    console.log('Items Count:', data.items?.length);
    console.log('Items:', JSON.stringify(data.items, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testApi();
