const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbkaflawosewcrmjkmrt.supabase.co';
const supabaseKey = 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';

const supabase = createClient(supabaseUrl, supabaseKey);

const data = {
	"playlists": [
		{
			"id": "f9a25586-7289-4a1d-b57b-38464f2fd543",
			"user_id": "1427121b-efda-49c6-abdf-59ad35523935",
			"name": "Songs We Sang",
			"created_at": "2026-09-20T11:36:43.898631+00:00"
		},
		{
			"id": "6588f28e-74cc-4202-a7de-599205a2b100",
			"user_id": "e1f037de-41f6-4ce0-9fc4-f90b4aa27d62",
			"name": "peace out",
			"created_at": "2026-09-21T04:55:01.15482+00:00"
		},
		{
			"id": "79006896-12a9-4356-8226-555a5c2f6041",
			"user_id": "1427121b-efda-49c6-abdf-59ad35523935",
			"name": "Liked Songs",
			"created_at": "2026-09-24T05:36:00.804275+00:00"
		},
		{
			"id": "081a4816-c620-4179-8533-db7fbb723c72",
			"user_id": "3104054a-8115-4cd9-834c-efcb6819d907",
			"name": "Liked Songs",
			"created_at": "2026-09-24T11:09:28.585254+00:00"
		},
		{
			"id": "1a8230e0-80dd-409b-8095-f1761ce31ad6",
			"user_id": "d5ce4c13-43ee-4426-8fc8-521d646a98ee",
			"name": "Liked Songs",
			"created_at": "2026-09-24T13:23:22.505001+00:00"
		},
		{
			"id": "caded47f-9127-4382-ae34-ff0004d81f96",
			"user_id": "be4768dd-b218-4638-a1ca-0cbb8563ab9f",
			"name": "Liked Songs",
			"created_at": "2026-09-24T13:25:27.227349+00:00"
		},
		{
			"id": "b04d2e76-acd2-44f8-977b-a558c207b8f7",
			"user_id": "be4768dd-b218-4638-a1ca-0cbb8563ab9f",
			"name": "Liked Songs",
			"created_at": "2026-09-24T13:25:27.277434+00:00"
		},
		{
			"id": "896550d2-c7c2-4b08-bbb2-8868a3bed789",
			"user_id": "be4768dd-b218-4638-a1ca-0cbb8563ab9f",
			"name": "Lalala",
			"created_at": "2026-09-24T13:30:55.909586+00:00"
		},
		{
			"id": "96f2185c-9f5b-4959-8569-81ed56ed7ab0",
			"user_id": "ceda8c9c-bcfb-46b6-85b1-9eacd1a7560b",
			"name": "Liked Songs",
			"created_at": "2026-09-24T15:03:03.838936+00:00"
		},
		{
			"id": "1ebfb6e4-16e0-46ff-92f6-3c171f83951c",
			"user_id": "ceda8c9c-bcfb-46b6-85b1-9eacd1a7560b",
			"name": "Ashu cafe",
			"created_at": "2026-09-24T15:03:46.526846+00:00"
		},
		{
			"id": "fe348fba-1ce9-41d1-b4b2-56089be0bade",
			"user_id": "bb7f0ecc-1919-4e13-b4f9-7b6ab67b58d0",
			"name": "Liked Songs",
			"created_at": "2026-09-24T18:42:32.310754+00:00"
		},
		{
			"id": "1d82dc1a-5afc-4864-a4d5-c64c29439dbb",
			"user_id": "938c1bb5-6c0a-4e98-bf81-5dc8c3a32ab7",
			"name": "Liked Songs",
			"created_at": "2026-09-25T21:55:41.954923+00:00"
		},
		{
			"id": "e06b65ab-bfef-430a-87be-c22bfffaefd2",
			"user_id": "63c27f6f-dccd-4800-9606-ffa2f8e332ca",
			"name": "Liked Songs",
			"created_at": "2026-09-27T11:31:05.921021+00:00"
		},
		{
			"id": "54d43d36-9232-4acd-8809-89c0ab963651",
			"user_id": "91e4824b-829e-481a-b049-15f997998a07",
			"name": "Liked Songs",
			"created_at": "2026-10-09T05:02:25.452723+00:00"
		},
		{
			"id": "9a91d0dd-4b0a-4e6f-b975-4747bd2a3ce9",
			"user_id": "c2f47b61-48cd-4a5b-90cd-7bc319b914b3",
			"name": "Liked Songs",
			"created_at": "2026-10-09T14:13:49.716971+00:00"
		},
		{
			"id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"user_id": "1427121b-efda-49c6-abdf-59ad35523935",
			"name": "Int. Pop",
			"created_at": "2026-10-09T22:05:02.762364+00:00"
		}
	],
	"playlist_songs": [
		{
			"playlist_id": "f9a25586-7289-4a1d-b57b-38464f2fd543",
			"song_id": "d8ffecc7-42ea-432b-8ec1-a79366bc2da7",
			"added_at": "2026-09-20T18:50:30.73165+00:00"
		},
		{
			"playlist_id": "6588f28e-74cc-4202-a7de-599205a2b100",
			"song_id": "49b5b3e7-060a-4367-b2f9-83e4b7b2e096",
			"added_at": "2026-09-21T04:55:13.295771+00:00"
		},
		{
			"playlist_id": "f9a25586-7289-4a1d-b57b-38464f2fd543",
			"song_id": "4a14527e-95d0-43c9-a06a-281aebd6ff34",
			"added_at": "2026-09-22T17:47:15.802924+00:00"
		},
		{
			"playlist_id": "f9a25586-7289-4a1d-b57b-38464f2fd543",
			"song_id": "6d493502-16ce-4915-8160-7b36cfd5cd05",
			"added_at": "2026-09-22T17:47:23.487272+00:00"
		},
		{
			"playlist_id": "79006896-12a9-4356-8226-555a5c2f6041",
			"song_id": "bd2f6814-1d6e-48a6-9f78-d8fd90c2bed8",
			"added_at": "2026-09-24T05:36:17.641798+00:00"
		},
		{
			"playlist_id": "79006896-12a9-4356-8226-555a5c2f6041",
			"song_id": "a3c7a170-b0f1-48ae-8cf4-a0bef69ee2b9",
			"added_at": "2026-09-24T10:32:31.815459+00:00"
		},
		{
			"playlist_id": "79006896-12a9-4356-8226-555a5c2f6041",
			"song_id": "f6e83060-33c6-457b-8ccf-b825929b2be4",
			"added_at": "2026-09-24T10:32:33.808217+00:00"
		},
		{
			"playlist_id": "79006896-12a9-4356-8226-555a5c2f6041",
			"song_id": "c0cbee49-81ba-4e72-8c52-410308ad361f",
			"added_at": "2026-09-24T10:32:36.8355+00:00"
		},
		{
			"playlist_id": "081a4816-c620-4179-8533-db7fbb723c72",
			"song_id": "283edc91-b796-45aa-a22e-e5ecf26c164f",
			"added_at": "2026-09-24T11:11:22.428498+00:00"
		},
		{
			"playlist_id": "081a4816-c620-4179-8533-db7fbb723c72",
			"song_id": "86ff8290-aa80-454d-8d35-b408f6463b49",
			"added_at": "2026-09-24T11:11:26.912461+00:00"
		},
		{
			"playlist_id": "081a4816-c620-4179-8533-db7fbb723c72",
			"song_id": "c3e49428-958a-4272-b658-dcc665373ba6",
			"added_at": "2026-09-24T11:11:31.655842+00:00"
		},
		{
			"playlist_id": "081a4816-c620-4179-8533-db7fbb723c72",
			"song_id": "49b5b3e7-060a-4367-b2f9-83e4b7b2e096",
			"added_at": "2026-09-24T11:11:33.025064+00:00"
		},
		{
			"playlist_id": "896550d2-c7c2-4b08-bbb2-8868a3bed789",
			"song_id": "6973477f-4917-4f28-9ff8-888f03de9ba2",
			"added_at": "2026-09-24T13:31:13.72984+00:00"
		},
		{
			"playlist_id": "896550d2-c7c2-4b08-bbb2-8868a3bed789",
			"song_id": "908b2deb-0831-4091-b5e1-dd77e0695a5c",
			"added_at": "2026-09-24T13:31:42.069171+00:00"
		},
		{
			"playlist_id": "896550d2-c7c2-4b08-bbb2-8868a3bed789",
			"song_id": "642a9c68-e797-48ea-8dab-c42287322c26",
			"added_at": "2026-09-24T13:32:02.377305+00:00"
		},
		{
			"playlist_id": "896550d2-c7c2-4b08-bbb2-8868a3bed789",
			"song_id": "d7f9d821-191e-4f5b-af3e-bfb98b155465",
			"added_at": "2026-09-24T13:32:08.314258+00:00"
		},
		{
			"playlist_id": "f9a25586-7289-4a1d-b57b-38464f2fd543",
			"song_id": "39fd084d-c05f-42dc-9cdf-369d47b44153",
			"added_at": "2026-09-25T21:22:40.224314+00:00"
		},
		{
			"playlist_id": "79006896-12a9-4356-8226-555a5c2f6041",
			"song_id": "2db28891-244e-4cc7-8bbe-b50f54f46bdd",
			"added_at": "2026-09-26T15:25:26.672578+00:00"
		},
		{
			"playlist_id": "e06b65ab-bfef-430a-87be-c22bfffaefd2",
			"song_id": "900af1a9-8b64-4092-913d-9dde80274d93",
			"added_at": "2026-09-28T10:14:31.081322+00:00"
		},
		{
			"playlist_id": "79006896-12a9-4356-8226-555a5c2f6041",
			"song_id": "a53e97ce-02e6-454c-b13a-0a26e2956e92",
			"added_at": "2026-10-09T20:07:09.272067+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "d8ffecc7-42ea-432b-8ec1-a79366bc2da7",
			"added_at": "2026-10-09T22:05:14.527309+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "5bfb6815-217d-4173-b8c8-93b69f3a7c0b",
			"added_at": "2026-10-09T22:05:21.857943+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "bf558395-c784-4100-93eb-cfa239715ca9",
			"added_at": "2026-10-09T22:05:28.005002+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "cbb3ca3e-67ca-43a8-8ac7-79a9390776a8",
			"added_at": "2026-10-09T22:05:32.725711+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "c55017cd-15ec-4546-99e8-f12bd5626f11",
			"added_at": "2026-10-09T22:05:37.849671+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "3cfe46d0-7912-4d3b-bc38-539d3b775bcf",
			"added_at": "2026-10-09T22:05:41.278469+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "4a14527e-95d0-43c9-a06a-281aebd6ff34",
			"added_at": "2026-10-09T22:05:47.567198+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "47d3fd86-a418-444e-9fdd-842ea10d06b7",
			"added_at": "2026-10-09T22:06:03.861492+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "6d493502-16ce-4915-8160-7b36cfd5cd05",
			"added_at": "2026-10-09T22:06:08.695166+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "be6f92a1-abc7-4992-9c9e-96e2701774c9",
			"added_at": "2026-10-09T22:06:14.047883+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "923ec288-02e0-4ae2-a13c-accde7ab486e",
			"added_at": "2026-10-09T22:06:17.916668+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "862a7fa8-2236-42b0-bbd6-b8a280a49c69",
			"added_at": "2026-10-09T22:06:26.108671+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "d17498d3-d2dc-4124-83a4-ae45d66c2aab",
			"added_at": "2026-10-09T22:06:32.355314+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "a3c7a170-b0f1-48ae-8cf4-a0bef69ee2b9",
			"added_at": "2026-10-09T22:06:36.127321+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "f6e83060-33c6-457b-8ccf-b825929b2be4",
			"added_at": "2026-10-09T22:06:40.847407+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "46136499-85f3-4da2-9484-9f451d511905",
			"added_at": "2026-10-09T22:06:47.451555+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "63eb50bd-9772-4c3f-ab26-976301fd2705",
			"added_at": "2026-10-09T22:06:52.053969+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "d724987f-83a9-4351-bd60-3a7502a87c59",
			"added_at": "2026-10-09T22:06:58.16265+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "2db28891-244e-4cc7-8bbe-b50f54f46bdd",
			"added_at": "2026-10-09T22:07:24.683212+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "39fd084d-c05f-42dc-9cdf-369d47b44153",
			"added_at": "2026-10-09T22:07:29.133923+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "0f80a99a-c418-4669-88ca-d64a5c857fdc",
			"added_at": "2026-10-09T22:07:33.319206+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "eb4f3985-fd6a-4a20-a48f-10717982804a",
			"added_at": "2026-10-09T22:07:36.807002+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "f7e6d9a4-e9b9-467b-bbf0-30e929696803",
			"added_at": "2026-10-09T22:07:41.397956+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "684b60fa-6f36-4e0b-b122-dd966f2ef7c3",
			"added_at": "2026-10-09T22:07:47.302765+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "e758b7f7-1169-4bf9-8a41-e883b9f24b3a",
			"added_at": "2026-10-09T22:07:51.301175+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "a26eea36-25f1-4754-a534-13ffd38f7ad5",
			"added_at": "2026-10-09T22:07:56.881773+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "d84c6343-8fa6-45e3-bc7a-a2803a8b220b",
			"added_at": "2026-10-09T22:08:00.791804+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "12b7b4c1-e3c6-4a0a-9769-8e9d3543b0bd",
			"added_at": "2026-10-09T22:08:06.213135+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "8c853546-b82b-46f6-ba04-0fc90d54965d",
			"added_at": "2026-10-09T22:08:21.025298+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "94e729cf-448c-490b-9926-bb9f5a1d4d50",
			"added_at": "2026-10-09T22:08:37.44615+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "c0d286b0-5df5-485b-8963-5532c0b47991",
			"added_at": "2026-10-09T22:08:41.962373+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "10ea99a7-be01-45c2-82fd-14fa0bcadb58",
			"added_at": "2026-10-09T22:08:45.803957+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "c4751b72-883d-40fe-8990-cb7dfeaac47b",
			"added_at": "2026-10-09T22:08:51.729225+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "3c6bb417-0b5e-475d-b8f0-3671a51b657b",
			"added_at": "2026-10-09T22:08:56.10202+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "fc041aa8-1b69-4f0e-ab4a-18e89d3499e0",
			"added_at": "2026-10-09T22:09:00.169006+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "4b17d938-0d77-4ccc-8da7-82cd9167218a",
			"added_at": "2026-10-09T22:09:03.636873+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "d1b3e3bc-77f6-4ee5-82ea-1e691b0b11c6",
			"added_at": "2026-10-09T22:09:09.639269+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "f40239c2-1f6b-45c5-9416-9eb733f7cd19",
			"added_at": "2026-10-09T22:09:15.894526+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "e6657092-d62b-4754-a347-548d0f3bde39",
			"added_at": "2026-10-09T22:09:30.790365+00:00"
		},
		{
			"playlist_id": "13d4f26f-0307-4c7f-b8f3-4c735505a30d",
			"song_id": "f54b3464-b992-466d-9b96-8ca95c1ad5ce",
			"added_at": "2026-10-09T22:09:35.881275+00:00"
		}
	]
};

async function run() {
  console.log(`Inserting ${data.playlists.length} playlists...`);
  const { error: pErr } = await supabase.from('playlists').upsert(data.playlists);
  if (pErr) console.error('Playlists error:', pErr);
  else console.log('✅ Playlists inserted successfully!');

  // Fetch all existing songs
  const { data: songs, error: songsErr } = await supabase.from('songs').select('id');
  if (songsErr) {
    console.error('Error fetching songs:', songsErr);
    return;
  }
  const songIdSet = new Set(songs.map(s => s.id));
  const validPlaylistSongs = data.playlist_songs.filter(ps => songIdSet.has(ps.song_id));
  const missingCount = data.playlist_songs.length - validPlaylistSongs.length;
  if (missingCount > 0) {
    console.log(`Skipped ${missingCount} songs that no longer exist in the songs catalog.`);
  }

  console.log(`Inserting ${validPlaylistSongs.length} playlist songs...`);
  const { error: sErr } = await supabase.from('playlist_songs').upsert(validPlaylistSongs, { onConflict: 'playlist_id,song_id' });
  if (sErr) console.error('Playlist songs error:', sErr);
  else console.log('✅ Playlist songs inserted successfully!');
}

run().catch(console.error);
