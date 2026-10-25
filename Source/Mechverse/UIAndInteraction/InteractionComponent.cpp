#include "UIAndInteraction/InteractionComponent.h"
#include "CollisionQueryParams.h"
#include "Engine/World.h"

UInteractionComponent::UInteractionComponent()
	: MaxInteractionDistanceCm(300.0f) // 3 meters workshop reach
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UInteractionComponent::PerformRaycastInteraction(const FVector& CameraLocation, const FVector& CameraForwardVector)
{
	UWorld* World = GetWorld();
	if (!World)
	{
		return;
	}

	const FVector TraceEnd = CameraLocation + (CameraForwardVector * MaxInteractionDistanceCm);
	FHitResult HitResult;
	FCollisionQueryParams QueryParams;
	QueryParams.AddIgnoredActor(GetOwner());

	const bool bHit = World->LineTraceSingleByChannel(HitResult, CameraLocation, TraceEnd, ECC_Visibility, QueryParams);

	UComponentBase* NewHovered = nullptr;
	if (bHit && HitResult.GetActor())
	{
		NewHovered = HitResult.GetActor()->FindComponentByClass<UComponentBase>();
	}

	if (NewHovered != CurrentlyHoveredComponent.Get())
	{
		CurrentlyHoveredComponent = NewHovered;
		OnComponentHoverChanged.Broadcast(NewHovered);
	}
}

void UInteractionComponent::SelectCurrentHovered()
{
	CurrentlySelectedComponent = CurrentlyHoveredComponent;
	OnComponentSelected.Broadcast(CurrentlySelectedComponent.Get());
}

void UInteractionComponent::ClearSelection()
{
	CurrentlySelectedComponent = nullptr;
	OnComponentSelected.Broadcast(nullptr);
}
