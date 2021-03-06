import { token } from './config';

export type SlackMember = {
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

export async function getUsersList (): Promise<SlackMember[]> {
  const response = await fetch(
    `https://slack.com/api/users.list?token=${token}`,
  );
  const list = await response.json();
  if (list.error) {
    throw new Error(`Cannot fetch slack users: ${list.error}`);
  }
  const { members } = list;
  const users = members.reduce(
    (accumulator, member) => {
      if (
        member.deleted ||
        member.is_bot ||
        member.is_app_user ||
        member.profile.first_name === 'slackbot' ||
        member.is_restricted ||
        !member.profile.first_name ||
        !member.profile.last_name
      ) {
        return accumulator;
      }

      const { profile } = member;

      if (profile.first_name === 'Sami' || !profile.first_name) console.log(member);
      return [
        ...accumulator,
        {
          firstName: profile.first_name,
          lastName: profile.last_name,
          avatarUrl: profile.image_192,
        },
      ]
    },
    [],
  );
  return users;
}