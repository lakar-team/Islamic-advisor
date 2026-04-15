export const onRequestGet = async (context: any) => {
    const { request } = context;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Construct the frontend hash URL to trigger the client-side processing
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (state) params.set('state', state);
    if (error) params.set('error', error);
    params.set('return', 'chat'); // Default to chat tab for reconnects

    return Response.redirect(`${origin}/#oauth-callback?${params.toString()}`);
};
